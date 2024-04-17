/*
    Intake24 Tasks
    Copyright (C) 2021-2023 MRC Epidemiology Unit, University of Cambridge

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { parse } from 'fast-csv';
import fs from 'fs-extra';
import sql from 'mssql';
import path from 'node:path';

import { api, logger } from '@/services';
import { sleep } from '@/util';

import type { Task, TaskDefinition } from '.';
import HasMsSqlPool from './has-mssql-pool';

export type ColumnInfo = Record<string, { name: string; type: string; nullable: boolean }>;

export type ExportSurveyTaskParams = {
  apiVersion: 'v3' | 'v4';
  survey: string;
  exportOffset?: number | null;
  exportVersion?: string;
};

export default class ExportSurveyData extends HasMsSqlPool implements Task<ExportSurveyTaskParams> {
  readonly name: string;

  readonly params: ExportSurveyTaskParams;

  private headers: string[];

  private data: string[][];

  private records: number;

  private isProcessing: boolean;

  private filename!: string;

  public message = '';

  constructor(taskDef: TaskDefinition<ExportSurveyTaskParams>) {
    super(taskDef);

    const { name, params } = taskDef;
    this.name = name;
    this.params = params;

    this.headers = [];
    this.data = [];
    this.records = 0;

    this.isProcessing = false;
  }

  async run() {
    await this.initMSPool();

    await this.readTableSchema();

    await this.fetchData();

    if (!this.filename)
      throw new Error(`Missing file: ${this.filename}`);

    await this.processSurveyData();

    await this.triggerLog();

    fs.unlink(this.filename, (err) => {
      if (err)
        logger.error(err);
    });

    await this.closeMSPool();

    const { message } = this;
    logger.info(message);

    return { message };
  }

  /**
   * Clear old survey data
   *
   * @static
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async clearOldSurveyData(): Promise<void> {
    await this.msPool.request().query(`DELETE FROM ${this.dbConfig.tables.data}`);
  }

  private async readTableSchema() {
    const result = await this.msPool
      .request()
      .input('table', sql.VarChar, this.dbConfig.tables.data)
      .query(`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table;`);

    const columnInfo = result.recordset.reduce<ColumnInfo>((acc, cur) => {
      acc[cur.COLUMN_NAME] = {
        name: cur.COLUMN_NAME,
        type: cur.DATA_TYPE,
        nullable: cur.IS_NULLABLE === 'YES',
      };
      return acc;
    }, {});

    return columnInfo;
  }

  /**
   * Export data from Intake24 instance
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async fetchData(): Promise<void> {
    this.filename = await api[this.params.apiVersion].fetchDataExportFile(this.params);
  }

  /**
   * Read the data-export file and stream the data into the DB
   *
   * @param {number} [chunk]
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async processSurveyData(chunk = 500): Promise<void> {
    await this.clearOldSurveyData();
    logger.info(`Task ${this.name}: Starting data import.`);

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filename).pipe(parse({ headers: false }));
      stream
        .on('data', (row) => {
          this.data.push(row);

          if (chunk > 0 && this.data.length === chunk) {
            stream.pause();
            this.storeToDB()
              .then(() => {
                stream.resume();
              })
              .catch((err) => {
                stream.destroy(err);
                reject(err);
              });
          }
        })
        .on('end', async (records: number) => {
          this.records = records - 1;

          while (this.isProcessing) await sleep(1000);

          this.storeToDB()
            .then(() => resolve())
            .catch((err) => {
              stream.destroy(err);
              reject(err);
            });
        })
        .on('error', err => reject(err));
    });
  }

  /**
   * Store loaded data to database
   *
   * @private
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async storeToDB(): Promise<void> {
    this.isProcessing = true;

    if (!this.headers.length)
      this.headers = this.data.shift() as string[];

    if (!this.data.length) {
      this.isProcessing = false;
      return;
    }

    const columnInfo = await this.readTableSchema();
    const table = new sql.Table(this.dbConfig.tables.data);
    // table.create = true;
    // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
    this.headers.forEach((column) => {
      const info = columnInfo[column];
      if (!info)
        throw new Error(`Missing column info for ${column}`);

      table.columns.add(
        column,
        info.type === 'uniqueidentifier' ? sql.UniqueIdentifier : sql.VarChar,
        { nullable: info.nullable },
      );
    });

    this.data.forEach((data) => {
      table.rows.add(...data.map(value => value || null));
    });

    const request = this.msPool.request();
    await request.bulk(table);

    this.data = [];

    this.isProcessing = false;
  }

  /**
   * Insert entry into database log to trigger further actions
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async triggerLog(): Promise<void> {
    logger.info(`Task ${this.name}: Triggering procedures.`);

    const ps = new sql.PreparedStatement(this.msPool);
    ps.input('ImportType', sql.VarChar);
    ps.input('ImportFileName', sql.VarChar);
    ps.input('ImportStatus', sql.VarChar);
    ps.input('ImportMessage', sql.VarChar);
    await ps.prepare(
      `INSERT INTO ${this.dbConfig.tables.log} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`,
    );

    this.message = `File processed: ${path.basename(this.filename)}, Rows imported: ${
      this.records
    }`;

    await ps.execute({
      ImportType: 'Intake24AutoStep1',
      ImportFileName: path.basename(this.filename),
      ImportStatus: 'Completed',
      ImportMessage: this.message,
    });
    await ps.unprepare();
  }
}
