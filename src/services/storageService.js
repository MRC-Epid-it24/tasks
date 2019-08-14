import fs from 'fs';
import csv from 'fast-csv';
import path from 'path';
import sql from 'mssql';
import config from '../config';
import schema from '../config/schema';

export default {
  data: [],
  filename: '',

  async storeToDB() {
    try {
      const pool = await sql.connect(config.db);

      // Import data
      await pool.request().query(`DELETE FROM ${schema.tables.data}`);
      const table = new sql.Table(schema.tables.data);
      // table.create = true;
      // schema.fields.forEach(field => table.columns.add(field.id, field.type, field.opt));
      const headers = this.data.shift();
      headers.forEach(column => table.columns.add(column, sql.VarChar(500), { nullable: true }));
      this.data.forEach(row => table.rows.add(...row));

      const result = await pool.request().bulk(table);

      // Insert entry into the log file
      const ps = new sql.PreparedStatement(pool);
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

      sql.close();
      return { message };
    } catch (err) {
      sql.close();
      throw err;
    }
  },

  async processFile(filename) {
    this.data = [];
    this.filename = filename;

    fs.createReadStream(filename)
      .pipe(csv.parse({ headers: false }))
      .on('data', row => this.data.push(row))
      .on('end', () => {
        fs.unlink(filename, err => {
          if (err) console.error(err);
        });
        this.storeToDB()
          .then(res => console.log(res.message))
          .catch(err => console.error(err));
      });
  }
};
