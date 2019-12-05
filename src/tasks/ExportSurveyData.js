import fs from 'fs';
import csv from 'fast-csv';
import path from 'path';
import sql from 'mssql';
import config from '../config';
import schema from '../config/schema';
import api from '../services/apiService';
import logger from '../services/logger';

const epidDB = config.db.epid;

export default class {
  constructor(params) {
    this.params = params;
    this.headers = [];
    this.data = [];
    this.count = 0;
    this.filename = '';
    this.pool = null;
  }

  /**
   * Run the job
   *
   * @return void
   */
  async run() {
    await api.login();
    this.filename = await api.exportSurveyData(this.params.survey, this.params.version);
    await this.processSurveyData(500);
  }

  /**
   * Open database connection pool
   *
   * @return void
   */
  async initDB() {
    this.pool = new sql.ConnectionPool(epidDB);
    await this.pool.connect();
  }

  /**
   * Close database connection pool
   *
   * @return void
   */
  async closeDB() {
    await this.pool.close();
  }

  /**
   * Delete old survey data
   *
   * @return void
   */
  async deleteOldData() {
    await this.pool.request().query(`DELETE FROM ${schema.tables.importData}`);
  }

  /**
   * Read the file and process the data
   *
   * @param int chunk
   * @return void
   */
  async processSurveyData(chunk = 0) {
    await this.initDB();
    await this.deleteOldData();

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filename).pipe(csv.parse({ headers: false }));
      stream
        .on('data', row => {
          this.data.push(row);
          this.count += 1;

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
  async storeToDB(end = false) {
    if (!this.headers.length) {
      this.headers = this.data.shift();
      this.count -= 1;
    }

    if (!this.data.length) return;

    const table = new sql.Table(schema.tables.importData);
    // table.create = true;
    // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
    this.headers.forEach(column => table.columns.add(column, sql.VarChar(500), { nullable: true }));
    this.data.forEach(data => table.rows.add(...data));

    const request = this.pool.request();
    await request.bulk(table);
    this.data = [];

    if (end) await this.triggerLog();
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
