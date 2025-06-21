/*
    Intake24 Tasks
    Copyright (C) 2021-2023 MRC Epidemiology Unit, University of Cambridge

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import type { PoolClient } from 'pg';
import type { Task, TaskDefinition } from '../index.js';
import pgPromise from 'pg-promise';
import schema from '@/config/schema.js';
import { db, logger } from '@/services/index.js';
import { HasMsSqlPool } from '../has-mssql-pool.js';

export type UploadPAQLinksTaskParams = {
  dbVersion: 'v3' | 'v4';
  survey: string;
};

type LinkData = {
  user_id: string;
  username: string;
  url: string;
};

type Stats = {
  added: number;
  removed: number;
};

export class UploadPAQLinks extends HasMsSqlPool implements Task<'UploadPAQLinks'> {
  readonly name = 'UploadPAQLinks';
  readonly params: UploadPAQLinksTaskParams;

  protected pgClient!: PoolClient;

  private data: LinkData[];

  private stats: Stats;

  private tempTable = 'it24_paq_links';

  private customField = 'PAQUrl';

  public output = { message: '' };

  constructor(taskDef: TaskDefinition<'UploadPAQLinks'>) {
    super(taskDef);

    this.params = taskDef.params;

    this.data = [];
    this.stats = {
      added: 0,
      removed: 0,
    };
  }

  async run() {
    await this.initMSPool();
    this.pgClient = await db[this.params.dbVersion].system.getPool().connect();

    try {
      await this.createTempTable();
      await this.importData();
      await this.addDisplayLinks();

      this.output.message = `Task ${this.name}: Number of links added: ${this.stats.added}. Number of links removed: ${this.stats.removed}.`;
    }
    finally {
      await this.dropTempTable();

      this.pgClient.release();
      await this.closeMSPool();
    }

    logger.info(this.output.message);

    return this.output;
  }

  /**
   * Re-create temporary table
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async createTempTable() {
    await this.dropTempTable();
    const createTable = `
      CREATE TEMPORARY TABLE ${this.tempTable}(
          user_id int8 NOT NULL,
          username varchar(256) NOT NULL,
          url varchar(1024) NOT NULL,
          CONSTRAINT ${this.tempTable}_pk PRIMARY KEY (user_id, username)
      );`;

    await this.pgClient.query(createTable);
  }

  /**
   * Drop temporary table
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async dropTempTable() {
    await this.pgClient.query(`DROP TABLE IF EXISTS ${this.tempTable};`);
  }

  /**
   * Import intake24-PAQ link data from MS SQL DB to intake24 DB (temp table)
   * - data are streamed and imported in chunks
   *
   * @private
   * @param {number} [chunk]
   * @returns {Promise<void>}
   * @memberof UploadPAQLinks
   */
  private async importData(chunk = 1000): Promise<void> {
    logger.debug(`Task ${this.name}: importLinkData started.`);

    return new Promise((resolve, reject) => {
      const request = this.msPool.request();
      request.stream = true;
      request.query<LinkData>(
        `SELECT Intake24UserID as user_id, SurveyUsername as username, PAQURL as url FROM ${schema.tables.paqLinks};`,
      );

      request
        .on('row', (row) => {
          this.data.push(row);

          if (chunk > 0 && this.data.length === chunk) {
            request.pause();
            this.storeDataChunk()
              .then(() => {
                request.resume();
              })
              .catch((err) => {
                request.cancel();
                reject(err);
              });
          }
        })
        .on('done', () => {
          this.storeDataChunk()
            .then(() => {
              logger.debug(`Task ${this.name}: importLinkData finished.`);
              resolve();
            })
            .catch((err) => {
              request.cancel();
              reject(err);
            });
        })
        .on('error', err => reject(err));
    });
  }

  /**
   * Store data chunk
   *
   * @private
   * @returns {Promise<void>}
   * @memberof UploadPAQLinks
   */
  private async storeDataChunk(): Promise<void> {
    // Short-cut if no more data
    if (!this.data.length)
      return;

    const pgp = pgPromise({ capSQL: true });
    const columnSet = new pgp.helpers.ColumnSet(['user_id', 'username', 'url'], {
      table: this.tempTable,
    });
    const inserts = pgp.helpers.insert(this.data, columnSet);

    await this.pgClient.query(inserts);

    this.data = [];
  }

  /**
   * Add PAQ links where consent was given
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async addDisplayLinks() {
    logger.debug(`Task ${this.name}: addDisplayLinks started.`);

    const insertQuery = `
      insert into user_custom_fields (user_id, "name", value)
      select usa.user_id, '${this.customField}' as "name", links.url as value
      from ${this.tempTable} links
      join user_survey_aliases usa on usa.user_id = links.user_id AND usa.username = links.username
      left join user_custom_fields ucf on ucf.user_id = usa.user_id and ucf."name" = '${this.customField}'
      where ucf.id is null
      and usa.survey_id = '${this.params.survey}';
    `;

    const queryRes = await this.pgClient.query(insertQuery);
    this.stats.added = queryRes.rowCount ?? 0;

    logger.debug(`Task ${this.name}: addDisplayLinks finished.`);
  }
}
