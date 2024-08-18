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
import pgPromise from 'pg-promise';

import schema from '@/config/schema.js';
import { db, logger } from '@/services/index.js';

import type { Task, TaskDefinition } from './index.js';
import HasMsSqlPool from './has-mssql-pool.js';

export type UploadDisplayNamesTaskParams = {
  dbVersion: 'v3' | 'v4';
  survey: string;
};

export type NamesData = {
  userId: number;
  name: string;
};

export type Stats = {
  added: number;
  removed: number;
};

export default class UploadDisplayNames
  extends HasMsSqlPool
  implements Task<UploadDisplayNamesTaskParams> {
  readonly name: string;

  readonly params: UploadDisplayNamesTaskParams;

  protected pgClient!: PoolClient;

  private tempTable = 'it24_display_names';

  private data: NamesData[];

  private stats: Stats;

  public message = '';

  constructor(taskDef: TaskDefinition<UploadDisplayNamesTaskParams>) {
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

  async run() {
    await this.initMSPool();
    this.pgClient = await db[this.params.dbVersion].system.getPool().connect();

    try {
      await this.createTempTable();
      await this.importData();
      await this.addNames();
      // await this.removeNames();

      this.message = `Task ${this.name}: Number of links added: ${this.stats.added}. Number of links removed: ${this.stats.removed}.`;
    }
    finally {
      await this.dropTempTable();

      this.pgClient.release();
      await this.closeMSPool();
    }

    const { message } = this;
    logger.info(message);

    return { message };
  }

  /**
   * Re-create temporary table
   *
   * @private
   * @memberof UploadDisplayNames
   */
  private async createTempTable() {
    await this.dropTempTable();

    const createTable = `
      CREATE TEMPORARY TABLE ${this.tempTable}(
          user_id int8 NOT NULL,
          name varchar(256) NOT NULL,
          CONSTRAINT ${this.tempTable}_pk PRIMARY KEY (user_id)
      );`;
    await this.pgClient.query(createTable);
  }

  /**
   * Drop temporary table
   *
   * @private
   * @memberof UploadDisplayNames
   */
  private async dropTempTable() {
    await this.pgClient.query(`DROP TABLE IF EXISTS ${this.tempTable};`);
  }

  /**
   * Import data to temporary table
   *
   * @private
   * @param {number} [chunk]
   * @returns {Promise<void>}
   * @memberof UploadDisplayNames
   */
  private async importData(chunk = 1000): Promise<void> {
    logger.debug(`Task ${this.name}: importNameData started.`);

    return new Promise((resolve, reject) => {
      const request = this.msPool.request();
      request.stream = true;
      request.query(
        `SELECT Intake24UserID as user_id, DisplayName as name FROM ${schema.tables.displayNames} WHERE DisplayName IS NOT NULL`,
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
   * @returns
   * @memberof UploadDisplayNames
   */
  private async storeDataChunk() {
    // Short-cut if no more data
    if (!this.data.length)
      return;

    const pgp = pgPromise({ capSQL: true });
    const columnSet = new pgp.helpers.ColumnSet(['user_id', 'name'], { table: this.tempTable });
    const inserts = pgp.helpers.insert(this.data, columnSet);

    await this.pgClient.query(inserts);

    this.data = [];
  }

  /**
   * Add display names where consent was given
   *
   * @private
   * @memberof UploadDisplayNames
   */
  private async addNames() {
    logger.debug(`Task ${this.name}: addNames started.`);

    const updateQuery = `update users set name = temp.name from ${this.tempTable} temp where users.id = temp.user_id;`;

    const queryRes = await this.pgClient.query(updateQuery);
    this.stats.added = queryRes.rowCount ?? 0;

    logger.debug(`Task ${this.name}: addNames finished.`);
  }
}
