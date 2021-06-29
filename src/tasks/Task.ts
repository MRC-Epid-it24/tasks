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

import sql, { ConnectionPool } from 'mssql';
import globalDB from '@/config/db';
import type { TaskDefinition, TaskDBConfig, Dictionary } from '.';

export default abstract class Task<T = Dictionary> {
  readonly name: string;

  readonly params: T;

  readonly dbConfig: TaskDBConfig;

  protected msPool!: ConnectionPool;

  abstract message: string;

  abstract run(): Promise<string>;

  constructor({ name, params, db }: TaskDefinition<T>) {
    this.name = name;
    this.params = params;

    if (!db) throw Error('No database connection info provided.');

    this.dbConfig = { ...globalDB.epid, ...db };
  }

  /**
   * Open DB connection pool
   *
   * @return void
   */
  protected async initMSPool(): Promise<void> {
    const { tables, ...rest } = this.dbConfig;

    this.msPool = new sql.ConnectionPool(rest);
    await this.msPool.connect();
  }

  /**
   * Close DB connection pool
   *
   * @return void
   */
  protected async closeMSPool(): Promise<void> {
    await this.msPool.close();
  }
}
