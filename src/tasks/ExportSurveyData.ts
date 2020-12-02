import { AxiosError } from 'axios';
import fs from 'fs-extra';
import { parse } from 'fast-csv';
import sql from 'mssql';
import path from 'path';
import api, { SurveyInfo, ExportSurveyDataParams } from '../services/intake24API';
import logger from '../services/logger';
import { Task, TaskDefinition } from './Task';

export default class ExportSurveyData extends Task {
  public surveyInfo!: SurveyInfo;

  private headers: any[];

  private data: any[];

  private count: number;

  private filename!: string;

  public message = '';

  constructor(taskDef: TaskDefinition) {
    super(taskDef);

    this.headers = [];
    this.data = [];
    this.count = 0;
  }

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof ExportSurveyData
   */
  async run(): Promise<string> {
    await this.initDB();

    await this.fetchIntake24Data();

    if (!this.filename) throw new Error(`Missing file: ${this.filename}`);

    await this.processSurveyData();

    await this.triggerLog();

    fs.unlink(this.filename, (err) => {
      if (err) logger.error(err);
    });

    await this.closeDB();

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
    await this.pool.request().query(`DELETE FROM ${this.dbConfig.tables.data}`);
  }

  /**
   * Get parameters for data export
   *
   * @returns {ExportSurveyDataParams}
   * @memberof ExportSurveyData
   */
  private getExportDataParams(): ExportSurveyDataParams {
    // Pull last 7-days data
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > this.surveyInfo.endDate) startDate = this.surveyInfo.endDate;

    return {
      dateFrom: startDate,
      dateTo: this.surveyInfo.endDate,
      forceBOM: '1',
      format: this.params.version,
    };
  }

  /**
   * Export data from Intake24 instance
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async fetchIntake24Data(): Promise<void> {
    const sleep = (ms: number) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

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
      } catch (err) {
        const { response } = err as AxiosError;

        // TEMP: intake24 very sporadically returns with 502 gateway error (nginx or outer proxy -> to investigate)
        if (response?.status === 502 && failedAttempts < 10) {
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
   * @param {number} [chunk=0]
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
          this.count++;

          if (chunk > 0 && this.data.length === chunk) {
            stream.pause();
            this.storeToDB()
              .then(() => {
                if (stream.destroyed) resolve();
                else stream.resume();
              })
              .catch((err) => {
                stream.destroy(err);
                reject(err);
              });
          }
        })
        .on('end', (records: number) => {
          if (records % chunk === 0) return;

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
   * @param {boolean} [eof=false]
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async storeToDB(): Promise<void> {
    if (!this.headers.length) {
      this.headers = this.data.shift();
      this.count--;
    }

    if (!this.data.length) return;

    const table = new sql.Table(this.dbConfig.tables.data);
    // table.create = true;
    // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
    this.headers.forEach((column) =>
      table.columns.add(column, column === 'Survey ID' ? sql.UniqueIdentifier : sql.VarChar(500), {
        nullable: true,
      })
    );
    this.data.forEach((data) => table.rows.add(...data));

    const request = this.pool.request();
    await request.bulk(table);
    this.data = [];
  }

  /**
   * Insert entry into database log to trigger further actions
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async triggerLog(): Promise<void> {
    logger.info(`Task ${this.name}: Triggering procedures.`);

    const ps = new sql.PreparedStatement(this.pool);
    ps.input('ImportType', sql.VarChar);
    ps.input('ImportFileName', sql.VarChar);
    ps.input('ImportStatus', sql.VarChar);
    ps.input('ImportMessage', sql.VarChar);
    await ps.prepare(
      `INSERT INTO ${this.dbConfig.tables.log} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`
    );

    this.message = `File processed: ${path.basename(this.filename)}, Rows imported: ${this.count}`;

    await ps.execute({
      ImportType: 'Intake24AutoStep1',
      ImportFileName: path.basename(this.filename),
      ImportStatus: 'Completed',
      ImportMessage: this.message,
    });
    await ps.unprepare();
  }
}
