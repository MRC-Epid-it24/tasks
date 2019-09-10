import fecha from 'fecha';
import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import { Pool } from 'pg';
import { parseAsync } from 'json2csv';
import config from '../config';
import schema from '../config/schema';
import api from '../services/apiService';
import asyncForEach from '../util/asyncForEach';

const { db } = config;

export default class {
  constructor(surveyName) {
    this.surveyName = surveyName;
    this.count = 0;
    this.data = {
      it24: [],
      epid: []
    };
    this.file = null;
    this.pool = {
      epid: null,
      it24: null
    };
  }

  /**
   * Run the job
   *
   * @return void
   */
  async run() {
    await api.login();
    await this.initDB();
    await this.getDisplayNames();

    // Do not use Intake24 API for update now
    // IT24 Bug: when API used, autoincrement gets bumped with each update
    /* if (this.file && fs.existsSync(this.file)) {
      await api.uploadSurveyRespondents(this.surveyName, this.file);
      fs.unlinkSync(this.file);
    } */

    await this.getIT24DisplayNames();
    await this.updateDisplayNames();
    await this.closeDB();
  }

  /**
   * Open database connection pool
   *
   * @return void
   */
  async initDB() {
    const { user, password, server, database } = db.epid;
    this.pool.epid = new mssql.ConnectionPool({ user, password, server, database });
    await this.pool.epid.connect();

    const { connectionString } = db.it24;
    this.pool.it24 = new Pool({ connectionString });
  }

  /**
   * Close database connection pool
   *
   * @return void
   */
  async closeDB() {
    await this.pool.epid.close();
    await this.pool.it24.end();
  }

  /**
   * Get display names from EPID DB
   *
   * @return void
   */
  async getDisplayNames() {
    const res = await this.pool.epid.request().query(
      `SELECT Intake24ID as 'user name', DisplayName as 'name'
          FROM ${schema.tables.displayNames} WHERE DisplayName IS NOT NULL`
    );

    this.data.epid = res.recordset;

    /* res.recordset.forEach(item => {
      // Current Intake24 API call expects to have username & password
      // Let's re-roll the password since we only use access token for respondents
      this.data.epid.push({ ...item, ...{ password: genPassword(9) } });
    }); */
  }

  /**
   * Get display names from Intake24 DB
   *
   * @return void
   */
  async getIT24DisplayNames() {
    const res = await this.pool.it24.query(
      `SELECT users.id, users.name, alias.user_name FROM users
        JOIN user_survey_aliases alias ON users.id = alias.user_id
        WHERE alias.survey_id = $1`,
      [this.surveyName]
    );

    this.data.it24 = res.rows;
  }

  /**
   * Filter display names to get the ones needing an update
   *
   * @return void
   */
  filterResults() {
    const task = this;

    this.data.epid = this.data.epid.filter(function(item) {
      const it24record = task.data.it24.find(
        row => item['user name'] === row.user_name && item.name !== row.name
      );
      return it24record !== undefined;
    });
  }

  /**
   * Update display name in Intake24 database
   *
   * @return void
   */
  async updateDisplayNames() {
    if (!this.data.epid.length) {
      console.log(`No EPID data. Skipping...`);
      return;
    }

    await asyncForEach(this.data.epid, async item => {
      const it24record = this.data.it24.find(
        row => item['user name'] === row.user_name && item.name !== row.name
      );

      if (it24record !== undefined) {
        this.count += 1;
        await this.pool.it24.query(`UPDATE users SET name = $1 WHERE id = $2`, [
          item.name,
          it24record.id
        ]);
      }
    });

    console.log(this.count ? `Records updated: ${this.count}` : `No records to updated.`);
  }

  /**
   * Save Display Name data from EPID DB to CSV file for upload
   *
   * @return void
   */
  async saveToCSV() {
    if (!this.data.length) {
      console.log(`No records to update, skipping...`);
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
}
