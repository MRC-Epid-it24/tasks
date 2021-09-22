/*
    Intake24 Tasks
    Copyright (C) 2021 MRC Epidemiology Unit, University of Cambridge

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

import axios from 'axios';
import fs from 'fs-extra';
import { parse } from 'fast-csv';
import sql from 'mssql';
import path from 'path';
import api, { SurveyInfo, ExportSurveyDataParams } from '@/services/intake24API';
import logger from '@/services/logger';
import type { Task, TaskDefinition } from '.';
import HasMsSqlPool from './has-mssql-pool';

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export type ExportSurveyTaskParams = {
  survey: string;
  exportOffset?: number | null;
  exportVersion?: string;
};

export default class ExportSurveyData extends HasMsSqlPool implements Task<ExportSurveyTaskParams> {
  readonly name: string;

  readonly params: ExportSurveyTaskParams;

  public surveyInfo!: SurveyInfo;

  private headers: string[];

  private data: any[];

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

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof ExportSurveyData
   */
  async run(): Promise<string> {
    await this.initMSPool();

    await this.fetchIntake24Data();

    if (!this.filename) throw new Error(`Missing file: ${this.filename}`);

    await this.processSurveyData();

    await this.triggerLog();

    fs.unlink(this.filename, (err) => {
      if (err) logger.error(err);
    });

    await this.closeMSPool();

    logger.info(this.message);

    return this.message;
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

  /**
   * Get parameters for data export
   *
   * @returns {ExportSurveyDataParams}
   * @memberof ExportSurveyData
   */
  private getExportDataParams(): ExportSurveyDataParams {
    const { exportOffset, exportVersion } = this.params;
    const { startDate, endDate: dateTo } = this.surveyInfo;

    let dateFrom: Date;

    if (exportOffset) {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - exportOffset);
      dateFrom.setHours(0, 0, 0, 0);

      if (dateFrom > dateTo) dateFrom = dateTo;
    } else {
      dateFrom = startDate;
    }

    return { dateFrom, dateTo, forceBOM: '1', format: exportVersion ?? 'v2' };
  }

  /**
   * Export data from Intake24 instance
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async fetchIntake24Data(): Promise<void> {
    const { survey } = this.params;
    await api.login();
    this.surveyInfo = await api.getSurvey(survey);
    const taskId = await api.asyncExportSurveyData(survey, this.getExportDataParams());

    let inProgress = true;
    let failedAttempts = 0;

    while (inProgress) {
      let activeTasks;
      try {
        activeTasks = await api.getActiveTasks(survey);
      } catch (err: any) {
        // TEMP: intake24 very sporadically returns with 502 gateway error (nginx or outer proxy -> to investigate)
        if (axios.isAxiosError(err) && err.response?.status === 502 && failedAttempts < 10) {
          logger.warn(
            `Task ${this.name}: IT24 API getActiveTasks responded with 502: ${err.message}`
          );
          failedAttempts++;
          await sleep(2000);
          continue;
        }

        // If any other error, stop the polling
        inProgress = false;
        throw new Error(`Task ${this.name}: IT24 API getActiveTasks failed with: ${err.message}`);
      }

      const task = activeTasks.find((item) => item.id === taskId);
      if (!task) {
        inProgress = false;
        logger.warn(`Task ${this.name}: DataExport task not found.`);
        return;
      }

      const [status, value] = Object.entries(task.status)[0];
      switch (status) {
        case 'Pending':
          logger.info(`Task ${this.name}: DataExport (Task ${taskId}) is pending.`);
          break;
        case 'InProgress':
          logger.info(
            `Task ${this.name}: DataExport (Task ${taskId}) is in progress (${Math.ceil(
              (value.progress as number) * 100
            )}%).`
          );
          break;
        case 'DownloadUrlPending':
          logger.info(
            `Task ${this.name}: DataExport (Task ${taskId}) is preparing URL for download.`
          );
          break;
        case 'DownloadUrlAvailable':
          inProgress = false;
          this.filename = await api.getExportFile(survey, value.url as string);
          logger.info(`Task ${this.name}: DataExport from Intake24 is done.`);
          break;
        case 'Failed':
          inProgress = false;
          throw new Error(`Task ${this.name}: DataExport (Task ${taskId}) has failed.`);
        default:
          inProgress = false;
          logger.warn(
            `Task ${this.name}: DataExport (Task ${taskId}) with invalid status (${status}).`
          );
          break;
      }

      if (inProgress) await sleep(2000);
    }
  }

  /**
   * Read the data-export file and stream the data into the DB
   *
   * @param {number} [chunk=500]
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
        .on('error', (err) => reject(err));
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

    if (!this.headers.length) this.headers = this.data.shift();

    if (!this.data.length) {
      this.isProcessing = false;
      return;
    }

    const table = new sql.Table(this.dbConfig.tables.data);
    // table.create = true;
    // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
    this.headers.forEach((column) =>
      table.columns.add(column, column === 'Survey ID' ? sql.UniqueIdentifier : sql.VarChar, {
        nullable: true,
      })
    );
    this.data.forEach((data) => table.rows.add(...data));

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
      `INSERT INTO ${this.dbConfig.tables.log} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`
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
