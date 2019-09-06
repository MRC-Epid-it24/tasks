import fecha from 'fecha';
import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import { Pool } from 'pg';
import { parseAsync } from 'json2csv';
import config from '../config';
import schema from '../config/schema';
import api from '../services/apiService';

const { db } = config;

export default class {
  constructor(surveyName) {
    this.surveyName = surveyName;
    this.data = {
      it24: [],
      epid: []
    };
    this.file = null;
    this.pool = null;
  }

  /**
   * Run the job
   *
   * @return void
   */
  async run() {
    await api.login();
    await this.getDisplayNames();
    await this.getIT24DisplayNames();
    this.filterResults();

    /* if (this.file && fs.existsSync(this.file)) {
      await api.uploadSurveyRespondents(this.surveyName, this.file);
      fs.unlinkSync(this.file);
    } */
  }

  /**
   * Open database connection pool
   *
   * @return void
   */
  async initDB() {
    const { user, password, server, database } = db.epid;
    this.pool = new mssql.ConnectionPool({ user, password, server, database });
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
   * Get display names from EPID DB
   *
   * @return void
   */
  async getDisplayNames() {
    await this.initDB();
    const res = await this.pool.request().query(
      `SELECT Intake24ID as 'user name', DisplayName as 'name'
          FROM ${schema.tables.displayNames} WHERE DisplayName IS NOT NULL`
    );

    // Current Intake24 API call expects to have username & password
    // Let's re-roll the password since we only use access token for respondents
    res.recordset.forEach(item => {
      this.data.epid.push({ ...item, ...{ password: this.constructor.genPassword(9) } });
    });

    await this.closeDB();
  }

  /**
   * Get display names from Intake24 DB
   *
   * @return void
   */
  async getIT24DisplayNames() {
    const { connectionString } = db.it24;
    const pool = new Pool({ connectionString });

    const res = await pool.query(
      `SELECT users.id, users.name, alias.user_name FROM users
        JOIN user_survey_aliases alias ON users.id = alias.user_id
        WHERE alias.survey_id = $1`,
      [this.surveyName]
    );

    this.data.it24 = res.rows;
    await pool.end();
  }

  filterResults() {
    const task = this;
    this.data.epid = this.data.epid.filter(function(item) {
      const it24record = task.data.it24.find(
        row => item['user name'] === row.user_name && item.name !== row.name
      );
      return it24record !== undefined;
    });

    console.log(`filterResults:`);
    console.log(this.data.epid);
  }

  /**
   * Save Display Name data from EPID DB to CSV file for upload
   *
   * @return void
   */
  async saveToCSV() {
    if (!this.data.length) {
      console.log(`No records to update, skipping`);
      return;
    }

    const csv = await parseAsync(this.data, { fields: ['user name', 'password', 'name'] });

    const file = `Intake24-display-name-${this.surveyName}_${fecha.format(
      new Date(),
      'YYYY-MM-DD-hh-mm-ss'
    )}.csv`;

    const dir = path.resolve('tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    this.file = path.resolve('tmp', file);
    fs.appendFileSync(this.file, csv);
  }

  /**
   * Generate password
   *
   * @return void
   */
  static genPassword(len) {
    const charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#$%&*<>?@~';
    let password = '';
    for (let i = 0; i < len; i += 1) {
      password += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    return password;
  }
}
