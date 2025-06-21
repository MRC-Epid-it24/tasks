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

import type { ConnectionPool } from 'mssql';
import type { TaskDBConfig, TaskDefinition } from './index.js';

import sql from 'mssql';

import globalDB from '@/config/db.js';

import { msSqlTypes } from '@/services/db.js';

export type ColumnInfo = Record<string, {
  name: string;
  type: keyof typeof msSqlTypes;
  nullable: boolean;
}>;

export abstract class HasMsSqlPool {
  readonly dbConfig: TaskDBConfig;

  protected msPool!: ConnectionPool;

  constructor({ db }: TaskDefinition) {
    if (!db)
      throw new Error('No database connection info provided.');

    this.dbConfig = { ...globalDB.epid, ...db };
  }

  /**
   * Open DB connection pool
   *
   * @protected
   * @returns
   * @memberof HasMsSqlPool
   */
  protected async initMSPool() {
    const { tables, ...rest } = this.dbConfig;

    this.msPool = new sql.ConnectionPool(rest);
    await this.msPool.connect();
  }

  /**
   * lose DB connection pool
   *
   * @protected
   * @returns
   * @memberof HasMsSqlPool
   */
  protected async closeMSPool() {
    await this.msPool.close();
  }

  protected async readTableSchema() {
    const result = await this.msPool
      .request()
      .input('table', sql.VarChar, this.dbConfig.tables.data)
      .query(`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table;`);

    return result.recordset.reduce<ColumnInfo>((acc, cur) => {
      acc[cur.COLUMN_NAME] = {
        name: cur.COLUMN_NAME,
        type: cur.DATA_TYPE,
        nullable: cur.IS_NULLABLE === 'YES',
      };
      return acc;
    }, {});
  }

  protected async prepareTable(headers: string[]) {
    const columnInfo = await this.readTableSchema();
    const table = new sql.Table(this.dbConfig.tables.data);
    const missingColumns: string[] = [];

    headers.forEach((column) => {
      const info = columnInfo[column];
      if (!info) {
        missingColumns.push(column);
        return;
      }

      table.columns.add(column, msSqlTypes[info.type], { nullable: info.nullable });
    });

    if (missingColumns.length)
      throw new Error(`Missing columns in the import table: ${missingColumns.join(', ')}`);

    return table;
  }
}
