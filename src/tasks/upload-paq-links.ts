/*
    Intake24 Tasks
    Copyright (C) 2021 MRC Epidemiology Unit, University of Cambridge

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

/* eslint-disable camelcase */
import { PoolClient } from 'pg';
import pgPromise from 'pg-promise';
import schema from '@/config/schema';
import db from '@/services/db';
import logger from '@/services/logger';
import type { Task, TaskDefinition } from '.';
import HasMsSqlPool from './has-mssql-pool';

export type UploadPAQLinksTaskParams = {
  survey: string;
};

export type OriginalLinkData = {
  Intake24ID: string;
  PAQURL: string;
  DisplayLink: string;
};

export type LinkData = {
  intake24_alias: string;
  paq_url: string;
  display_link: string;
};

export type Stats = {
  added: number;
  removed: number;
};

export default class UploadPAQLinks extends HasMsSqlPool implements Task<UploadPAQLinksTaskParams> {
  readonly name: string;

  readonly params: UploadPAQLinksTaskParams;

  protected pgClient!: PoolClient;

  private data: OriginalLinkData[];

  private stats: Stats;

  private tempTable = 'it24_paq_links';

  private customField = 'redirect url';

  public message = '';

  constructor(taskDef: TaskDefinition<UploadPAQLinksTaskParams>) {
    super(taskDef);

    const { name, params } = taskDef;
    this.name = name;
    this.params = params;

    this.data = [];
    this.stats = {
      added: 0,
      removed: 0,
    };
  }

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof UploadPAQLinks
   */
  async run(): Promise<string> {
    await this.initMSPool();
    this.pgClient = await db.system.connect();

    try {
      await this.createTempTable();
      await this.importLinkData();
      await this.addDisplayLinks();
      await this.removeDisplayLinks();

      this.message = `Task ${this.name}: Number of links added: ${this.stats.added}. Number of links removed: ${this.stats.removed}.`;
    } finally {
      await this.cleanTempTable();

      this.pgClient.release();
      await this.closeMSPool();
    }

    logger.info(this.message);

    return this.message;
  }

  /**
   * Create temporary table to hold intake24-PAQ link data
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async createTempTable() {
    const dropTable = `DROP TABLE IF EXISTS ${this.tempTable};`;
    const createTable = `
      CREATE TEMPORARY TABLE ${this.tempTable}(
          intake24_alias varchar(32) NOT NULL,
          paq_url varchar(512) NOT NULL,
          display_link varchar(32) NOT NULL,
          CONSTRAINT ${this.tempTable}_pk PRIMARY KEY (intake24_alias)
      );`;

    await this.pgClient.query(dropTable);
    await this.pgClient.query(createTable);
  }

  /**
   * Drop temporary table with intake24-PAQ link dataa
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async cleanTempTable() {
    await this.pgClient.query(`DROP TABLE IF EXISTS ${this.tempTable};`);
  }

  /**
   * Import intake24-PAQ link data from MS SQL DB to intake24 DB (temp table)
   * - data are streamed and imported in chunks
   *
   * @private
   * @param {number} [chunk=1000]
   * @returns {Promise<void>}
   * @memberof UploadPAQLinks
   */
  private async importLinkData(chunk = 1000): Promise<void> {
    logger.debug(`Task ${this.name}: importLinkData started.`);

    return new Promise((resolve, reject) => {
      const request = this.msPool.request();
      request.stream = true;
      request.query(`SELECT Intake24ID, PAQURL, DisplayLink FROM ${schema.tables.paqLinks};`);

      request
        .on('row', (row) => {
          this.data.push(row);

          if (chunk > 0 && this.data.length === chunk) {
            request.pause();
            this.storeLinkDataChunk()
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
          this.storeLinkDataChunk()
            .then(() => {
              logger.debug(`Task ${this.name}: importLinkData finished.`);
              resolve();
            })
            .catch((err) => {
              request.cancel();
              reject(err);
            });
        })
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Store chunk of intake24-PAQ link data
   *
   * @private
   * @returns {Promise<void>}
   * @memberof UploadPAQLinks
   */
  private async storeLinkDataChunk(): Promise<void> {
    // Short-cut if no more data
    if (!this.data.length) return;

    const data: LinkData[] = this.data.map((item) => ({
      intake24_alias: item.Intake24ID,
      paq_url: item.PAQURL,
      display_link: item.DisplayLink.toLowerCase(),
    }));

    const pgp = pgPromise({ capSQL: true });

    const columnSet = new pgp.helpers.ColumnSet(['intake24_alias', 'paq_url', 'display_link'], {
      table: 'it24_paq_links',
    });
    const inserts = pgp.helpers.insert(data, columnSet);

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
      select sa.user_id, '${this.customField}' as "name", links.paq_url as value
      from ${this.tempTable} links
      join user_survey_aliases sa on sa.user_name = links.intake24_alias
      left join user_custom_fields uc on uc.user_id = sa.user_id and uc."name" = '${this.customField}'
      where uc.id is null
      and sa.survey_id = '${this.params.survey}'
      and links.display_link = 'yes'
    `;

    const queryRes = await this.pgClient.query(insertQuery);
    this.stats.added = queryRes.rowCount;

    logger.debug(`Task ${this.name}: addDisplayLinks finished.`);
  }

  /**
   * Remove PAQ links where consent was not given
   *
   * @private
   * @memberof UploadPAQLinks
   */
  private async removeDisplayLinks() {
    logger.debug(`Task ${this.name}: removeDisplayLinks started.`);

    const removeQuery = `
      delete from user_custom_fields uc 
      using user_survey_aliases su, ${this.tempTable} links
      where uc.user_id = su.user_id
      and su.user_name = links.intake24_alias
      and su.survey_id = '${this.params.survey}'
      and uc."name" = '${this.customField}'
      and links.display_link = 'no';
    `;

    const queryRes = await this.pgClient.query(removeQuery);
    this.stats.removed = queryRes.rowCount;

    logger.debug(`Task ${this.name}: removeDisplayLinks finished.`);
  }
}
