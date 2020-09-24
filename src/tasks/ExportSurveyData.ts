import fs from 'fs';
import * as csv from 'fast-csv';
import path from 'path';
import sql, { ConnectionPool } from 'mssql';
import api, { SurveyInfo, ExportSurveyDataParams } from '../services/intake24API';
import logger from '../services/logger';
import { Task, TaskDefinition, TaskParameters, TaskDBConfig } from './Task';

export default class ExportSurveyData implements Task {
  public name: string;

  public params: TaskParameters;

  public dbConfig: TaskDBConfig;

  public surveyInfo!: SurveyInfo;

  private headers: any[];

  private data: any[];

  private count: number;

  private filename!: string;

  private pool!: ConnectionPool;

  public message = '';

  constructor({ name, params, db }: TaskDefinition) {
    this.name = name;
    this.params = params;

    if (!db) throw Error('No database connection info provided.');

    this.dbConfig = db;

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
    if (this.filename) await this.processSurveyData(500);

    await this.closeDB();

    logger.info(this.message);

    return this.message;
  }

  /**
   * Open DB connection pool
   *
   * @return void
   */
  private async initDB(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tables, ...rest } = this.dbConfig;

    this.pool = new sql.ConnectionPool(rest);
    await this.pool.connect();
  }

  /**
   * Close DB connection pool
   *
   * @return void
   */
  private async closeDB(): Promise<void> {
    await this.pool.close();
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

    while (inProgress) {
      const activeTasks = await api.getActiveTasks(survey);
      const task = activeTasks.find((item) => item.id === taskId);
      if (!task) {
        inProgress = false;
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
          logger.error(`Task ${this.name}: DataExport (Task ${taskId}) has failed.`);
          break;
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
  private async processSurveyData(chunk = 0): Promise<void> {
    await this.clearOldSurveyData();
    logger.info(`Task ${this.name}: Starting data import.`);

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filename).pipe(csv.parse({ headers: false }));
      stream
        .on('data', (row) => {
          this.data.push(row);
          this.count++;

          if (chunk > 0 && this.data.length === chunk) {
            stream.pause();
            this.storeToDB()
              .then(() => stream.resume())
              .catch((err) => reject(err));
          }
        })
        .on('end', () => {
          this.storeToDB(true)
            .then(() => {
              fs.unlink(this.filename, (err) => {
                if (err) logger.info(err);
              });
              resolve();
            })
            .catch((err) => reject(err));
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
  private async storeToDB(eof = false): Promise<void> {
    if (!this.headers.length) {
      this.headers = this.data.shift();
      this.count--;
    }

    if (!this.data.length) {
      logger.info(`Task ${this.name}: Data import finished, triggering procedures.`);
      await this.triggerLog();
      return;
    }

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

    if (eof) {
      logger.info(`Task ${this.name}: Data import finished, triggering procedures.`);
      await this.triggerLog();
    }
  }

  /**
   * Insert entry into database log to trigger further actions
   *
   * @returns {Promise<void>}
   * @memberof ExportSurveyData
   */
  private async triggerLog(): Promise<void> {
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
