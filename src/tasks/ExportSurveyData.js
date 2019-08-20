import fs from 'fs';
import csv from 'fast-csv';
import path from 'path';
import sql from 'mssql';
import config from '../config';
import schema from '../config/schema';
import api from '../services/apiService';

export default class {
  constructor(surveyName) {
    this.surveyName = surveyName;
    this.data = [];
    this.filename = '';
    this.pool = null;
  }

  async initDB() {
    this.pool = new sql.ConnectionPool(config.db);
    await this.pool.connect();
  }

  async closeDB() {
    await this.pool.close();
  }

  async run() {
    try {
      await api.login();
      this.filename = await api.exportData(this.surveyName);
      await this.importSurveyData();
      console.log(`Task EXPORT_SURVEY_DATA processed.`);
    } catch (err) {
      console.error(`Task EXPORT_SURVEY_DATA failed: ${err}`);
    }
  }

  async importSurveyData() {
    fs.createReadStream(this.filename)
      .pipe(csv.parse({ headers: false }))
      .on('data', row => this.data.push(row))
      .on('end', () => {
        fs.unlink(this.filename, err => {
          if (err) console.error(err);
        });

        this.storeToDB()
          .then(res => console.log(res.message))
          .catch(err => console.error(err));
      });
  }

  async storeToDB() {
    await this.initDB();
    try {
      // Import data
      await this.pool.request().query(`DELETE FROM ${schema.tables.data}`);
      const table = new sql.Table(schema.tables.data);
      // table.create = true;
      // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
      const headers = this.data.shift();
      headers.forEach(column => table.columns.add(column, sql.VarChar(500), { nullable: true }));
      this.data.forEach(row => table.rows.add(...row));

      const result = await this.pool.request().bulk(table);

      // Insert entry into the log file to trigger further actions
      const ps = new sql.PreparedStatement(this.pool);
      ps.input('ImportType', sql.VarChar);
      ps.input('ImportFileName', sql.VarChar);
      ps.input('ImportStatus', sql.VarChar);
      ps.input('ImportMessage', sql.VarChar);
      await ps.prepare(
        `INSERT INTO ${schema.tables.log} (ImportType, ImportFileName, ImportStatus, ImportMessage) VALUES (@ImportType, @ImportFileName, @ImportStatus, @ImportMessage)`
      );
      const message = `File processed: ${path.basename(this.filename)}, Rows imported: ${
        result.rowsAffected
      }`;
      await ps.execute({
        ImportType: 'Intake24AutoStep1',
        ImportFileName: path.basename(this.filename),
        ImportStatus: 'Completed',
        ImportMessage: message
      });
      await ps.unprepare();

      return { message };
    } finally {
      await this.closeDB();
    }
  }
}
