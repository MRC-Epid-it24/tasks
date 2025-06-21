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

import type { Task, TaskDefinition } from './index.js';
import path from 'node:path';
import { parse } from 'fast-csv';
import fs from 'fs-extra';
import sql from 'mssql';
import { api, logger } from '@/services/index.js';
import { sleep } from '@/util/index.js';
import { HasMsSqlPool } from './has-mssql-pool.js';

export type ExportSurveyTaskParams = {
  apiVersion: 'v3' | 'v4';
  survey: string;
  exportOffset?: number | null;
  exportVersion?: string;
};

export class ExportSurveyData extends HasMsSqlPool implements Task<'ExportSurveyData'> {
  readonly name = 'ExportSurveyData';
  readonly params: ExportSurveyTaskParams;

  private headers: string[];

  private data: string[][];

  private records: number;

  private isProcessing: boolean;

  private filename!: string;

  public output = {
    message: '',
    surveyCode: '',
  };

  constructor(taskDef: TaskDefinition<'ExportSurveyData'>) {
    super(taskDef);

    this.params = taskDef.params;

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

    logger.info(this.output.message);

    return this.output;
  }

  /**
   * Clear old survey data
   *
   * @static
   * @returns
   * @memberof ExportSurveyData
   */
  private async clearOldSurveyData() {
    await this.msPool.request().query(`DELETE FROM ${this.dbConfig.tables.data}`);
  }

  /**
   * Export data from Intake24 instance
   *
   * @returns
   * @memberof ExportSurveyData
   */
  private async fetchData() {
    const [surveyCode, filename] = await api[this.params.apiVersion].fetchDataExportFile(this.params);

    this.filename = filename;
    this.output.surveyCode = surveyCode;
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
   * @returns
   * @memberof ExportSurveyData
   */
  private async storeToDB() {
    this.isProcessing = true;

    if (!this.headers.length)
      this.headers = this.data.shift() as string[];

    if (!this.data.length) {
      this.isProcessing = false;
      return;
    }

    const table = await this.prepareTable(this.headers);

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
   * @returns
   * @memberof ExportSurveyData
   */
  private async triggerLog() {
    logger.info(`Task ${this.name}: Triggering procedures.`);

    const ps = new sql.PreparedStatement(this.msPool);
    ps.input('ImportType', sql.VarChar);
    ps.input('ImportFileName', sql.VarChar);
    ps.input('ImportStatus', sql.VarChar);
    ps.input('ImportMessage', sql.VarChar);
    await ps.prepare(
      `INSERT INTO ${this.dbConfig.tables.log} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`,
    );

    this.output.message = `File processed: ${path.basename(this.filename)}, Rows imported: ${this.records}`;

    await ps.execute({
      ImportType: 'Intake24AutoStep1',
      ImportFileName: path.basename(this.filename),
      ImportStatus: 'Completed',
      ImportMessage: this.output.message,
    });
    await ps.unprepare();
  }
}
