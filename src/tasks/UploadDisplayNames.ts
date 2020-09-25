import fecha from 'fecha';
import { parseAsync } from 'json2csv';
import schema from '../config/schema';
import { pg } from '../services/db';
import logger from '../services/logger';
import storage from '../services/storage';
import { Task, TaskDefinition } from './Task';

export type Results = {
  it24: IT24Result[];
  epid: EpidResult[];
  filtered: EpidResult[];
};

export type EpidResult = {
  'user name': string;
  name: string;
};

export type IT24Result = {
  id: number;
  name: string;
  // eslint-disable-next-line camelcase
  user_name: string;
};

export default class ExportSurveyData extends Task {
  public data: Results;

  public count: number;

  public file: string | null;

  public message = '';

  constructor(taskDef: TaskDefinition) {
    super(taskDef);

    this.count = 0;
    this.data = {
      it24: [],
      epid: [],
      filtered: [],
    };

    this.file = null;
  }

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof ExportSurveyData
   */
  async run(): Promise<string> {
    await this.initDB();

    await this.getDisplayNames();

    // Do not use Intake24 API for update now
    // IT24 Bug: when API used, autoincrement gets bumped with each update
    /* if (this.file && fs.existsSync(this.file)) {
      await api.uploadSurveyRespondents(this.survey, this.file);
      fs.unlinkSync(this.file);
    } */

    await this.getIT24DisplayNames();
    await this.updateDisplayNames();

    await this.closeDB();

    logger.info(this.message);

    return this.message;
  }

  /**
   * Get display names from EPID DB
   *
   * @return void
   */
  async getDisplayNames(): Promise<void> {
    const res = await this.pool.request().query<EpidResult>(
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
  async getIT24DisplayNames(): Promise<void> {
    const res = await pg.query<IT24Result>(
      `SELECT users.id, users.name, alias.user_name FROM users
        JOIN user_survey_aliases alias ON users.id = alias.user_id
        WHERE alias.survey_id = $1`,
      [this.params.survey]
    );

    this.data.it24 = res.rows;
  }

  /**
   * Update display name in Intake24 database
   *
   * @return void
   */
  async updateDisplayNames(): Promise<void> {
    if (!this.data.epid.length) {
      this.message = `Task ${this.name}: No EPID data. Skipping...`;
      return;
    }

    for (const item of this.data.epid) {
      const it24record = this.data.it24.find(
        (row) => item['user name'] === row.user_name && item.name !== row.name
      );

      if (it24record !== undefined) {
        this.count += 1;
        await pg.query(`UPDATE users SET name = $1 WHERE id = $2`, [item.name, it24record.id]);
      }
    }

    this.message = this.count
      ? `Task ${this.name}: Records updated: ${this.count}`
      : `Task ${this.name}: No records to update.`;
  }

  /**
   * Filter display names to get the ones needing an update
   *
   * @return void
   */
  filterResults(): void {
    this.data.filtered = this.data.epid.filter(
      (item) =>
        this.data.it24.find(
          (row) => item['user name'] === row.user_name && item.name !== row.name
        ) !== undefined
    );
  }

  /**
   * Save Display Name data from EPID DB to CSV file for upload
   *
   * @return void
   */
  async saveToCSV(): Promise<void> {
    if (!this.data.filtered.length) {
      logger.info(`Task ${this.name}: No records to update, skipping...`);
      return;
    }

    const csv = await parseAsync(this.data.filtered, { fields: ['user name', 'password', 'name'] });

    const filename = `Intake24-display-name-${this.params.survey}_${fecha.format(
      new Date(),
      'YYYY-MM-DD-hh-mm-ss'
    )}.csv`;

    this.file = storage.save(filename, csv);
  }
}
