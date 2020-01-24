/* eslint-disable no-await-in-loop */
import fs from 'fs';
import * as csv from 'fast-csv';
import path from 'path';
import sql from 'mssql';
import config from '../config';
import api from '../services/intake24API';
import logger from '../services/logger';

const { schema } = config;

export default class {
  constructor({ name, params }) {
    this.name = name;
    this.params = params;
    this.surveyInfo = null;

    this.headers = [];
    this.data = [];
    this.count = 0;
    this.filename = null;

    this.pool = null;
  }

  /**
   * Run the job
   *
   * @return void
   */
  async run() {
    await this.fetchIntake24Data();
    if (this.filename) await this.processSurveyData(500);
  }

  /**
   * Get parameters for data export
   *
   * @return Object
   */
  getExportDataParams() {
    // Pull last 7-days data
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > this.surveyInfo.endDate) startDate = this.surveyInfo.endDate;

    return {
      dateFrom: startDate,
      dateTo: this.surveyInfo.endDate,
      forceBOM: '1',
      format: this.params.version
    };
  }

  /**
   * Export data from Intake24 instance
   *
   * @return void
   */
  async fetchIntake24Data() {
    const sleep = ms => {
      return new Promise(resolve => setTimeout(resolve, ms));
    };

    const { survey } = this.params;
    await api.login();
    this.surveyInfo = await api.getSurvey(survey);
    const taskId = await api.asyncExportSurveyData(survey, this.getExportDataParams());

    let inProgress = true;

    while (inProgress) {
      const activeTasks = await api.getActiveTasks(survey);
      const task = activeTasks.find(item => item.id === taskId);

      const [status, value] = Object.entries(task.status)[0];
      switch (status) {
        case 'Pending':
          logger.info(`Task ${this.name}: DataExport (Task ${taskId}) is pending.`);
          break;
        case 'InProgress':
          logger.info(
            `Task ${this.name}: DataExport (Task ${taskId}) is in progress (${Math.ceil(
              value.progress * 100
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
          this.filename = await api.getExportFile(survey, value.url);
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
   * Open DB connection pool
   *
   * @return void
   */
  async initDB() {
    this.pool = new sql.ConnectionPool({ ...config.db.epid, ...config.mssql });
    await this.pool.connect();
  }

  /**
   * Close DB connection pool
   *
   * @return void
   */
  async closeDB() {
    await this.pool.close();
  }

  /**
   * Clear old survey data
   *
   * @return void
   */
  async clearOldSurveyData() {
    await this.pool.request().query(`DELETE FROM ${schema.tables.importData}`);
  }

  /**
   * Read the data-export file and stream the data into the DB
   *
   * @param int chunk
   * @return void
   */
  async processSurveyData(chunk = 0) {
    await this.initDB();
    await this.clearOldSurveyData();
    logger.info(`Task ${this.name}: Starting data import.`);

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filename).pipe(csv.parse({ headers: false }));
      stream
        .on('data', row => {
          this.data.push(row);
          this.count++;

          if (chunk > 0 && this.data.length === chunk) {
            stream.pause();
            this.storeToDB()
              .then(() => stream.resume())
              .catch(err => reject(err));
          }
        })
        .on('end', () => {
          this.storeToDB(true)
            .then(() => {
              fs.unlink(this.filename, err => {
                if (err) logger.info(err);
              });
              resolve({ status: 'success' });
            })
            .catch(err => reject(err));
        })
        .on('error', err => {
          this.closeDB();
          reject(err);
        });
    });
  }

  /**
   * Store loaded data to database
   *
   * @return void
   */
  async storeToDB(eof = false) {
    if (!this.headers.length) {
      this.headers = this.data.shift();
      this.count--;
    }

    if (!this.data.length) {
      logger.info(`Task ${this.name}: Data import finished, triggering procedures.`);
      await this.triggerLog();
      return;
    }

    const table = new sql.Table(schema.tables.importData);
    // table.create = true;
    // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
    this.headers.forEach(column => table.columns.add(column, sql.VarChar(500), { nullable: true }));
    this.data.forEach(data => table.rows.add(...data));

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
   * @return void
   */
  async triggerLog() {
    const ps = new sql.PreparedStatement(this.pool);
    ps.input('ImportType', sql.VarChar);
    ps.input('ImportFileName', sql.VarChar);
    ps.input('ImportStatus', sql.VarChar);
    ps.input('ImportMessage', sql.VarChar);
    await ps.prepare(
      `INSERT INTO ${schema.tables.importLog} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`
    );
    const message = `File processed: ${path.basename(this.filename)}, Rows imported: ${this.count}`;
    await ps.execute({
      ImportType: 'Intake24AutoStep1',
      ImportFileName: path.basename(this.filename),
      ImportStatus: 'Completed',
      ImportMessage: message
    });
    await ps.unprepare();
    await this.closeDB();
    logger.info(message);
  }
}
