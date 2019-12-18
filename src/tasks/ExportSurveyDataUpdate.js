import fs from 'fs';
import * as csv from 'fast-csv';
import sql from 'mssql';
import config from '../config';
import logger from '../services/logger';
import ExportSurveyData from './ExportSurveyData';

const { schema } = config;

/*
 * Based on original script
 * Original version truncate all data and reimport whole set
 * This version keeps old data and only adds new data
 */

class ExportSurveyDataUpdate extends ExportSurveyData {
  constructor({ name, params }) {
    super({ name, params });
  }

  /**
   * Read the data-export file and stream the data into the DB
   *
   * @param int chunk
   * @return void
   */
  async processSurveyData(chunk = 0) {
    await this.initDB();
    logger.info(`Task ${this.name}: Starting data import.`);

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filename).pipe(csv.parse({ headers: false }));
      stream
        .on('data', row => {
          const pause =
            chunk > 0 && this.data.length > chunk && row[0] !== this.data[this.data.length - 1][0];

          if (pause) {
            stream.pause();
            stream.unshift(row);

            this.storeToDB()
              .then(() => stream.resume())
              .catch(err => reject(err));
          } else {
            this.data.push(row);
            this.count++;
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
      this.count--;
    }

    if (!this.data.length) return;

    const uuids = this.data.map(item => item[0]);
    let localData = await this.pool
      .request()
      .query(
        `SELECT "Survey ID" FROM ${schema.tables.importData} WHERE "Survey ID" IN ('${uuids.join(
          `','`
        )}')`
      );

    localData = localData.recordset.map(item => item['Survey ID']);

    this.data = this.data.filter(item => !localData.includes(item[0]));

    if (this.data.length) {
      const table = new sql.Table(schema.tables.importData);
      // table.create = true;
      // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
      this.headers.forEach(column =>
        table.columns.add(column, sql.VarChar(500), { nullable: true })
      );
      this.data.forEach(data => table.rows.add(...data));

      const request = this.pool.request();
      await request.bulk(table);
      this.data = [];
    }

    if (end) {
      logger.info(`Task ${this.name}: Data import finished, triggering procedures.`);
      await this.triggerLog();
    }
  }
}

export default ExportSurveyDataUpdate;
