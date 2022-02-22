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

import fs from 'fs-extra';
import path from 'path';
import dbConfig from '@/config/db';
import pgDump from '@/services/pg-dump';
import logger from '@/services/logger';
import { FileInfo, Intake24Database } from '@/types';
import type { Task, TaskDefinition } from '.';

export type PgDumpToLocalTaskParams = {
  database: Intake24Database | Intake24Database[];
  path: string;
};

export default class PgDumpToLocal implements Task<PgDumpToLocalTaskParams> {
  readonly name: string;

  readonly params: PgDumpToLocalTaskParams;

  public message = '';

  constructor({ name, params }: TaskDefinition<PgDumpToLocalTaskParams>) {
    this.name = name;
    this.params = params;
  }

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof PgDumpToSftp
   */
  async run(): Promise<string> {
    const databases = Array.isArray(this.params.database)
      ? this.params.database
      : [this.params.database];

    for (const db of databases) {
      const pgBackup = pgDump({ db, connection: dbConfig[db] });

      await pgBackup.createPgPass();
      const backup = await pgBackup.runDump();
      await pgBackup.removePgPass();

      await this.copyToDestination(db, backup);
    }

    this.message = `Task ${this.name}: Database backup successful.`;
    logger.info(this.message);

    return this.message;
  }

  /**
   * Transfer file to its destination
   *
   * @private
   * @param {FileInfo} file
   * @returns {Promise<void>}
   * @memberof PgDumpToSftp
   */
  private async copyToDestination(db: Intake24Database, file: FileInfo): Promise<void> {
    logger.debug(`Task ${this.name}: transfer of '${file.name}' started.`);

    const srcPathCheck = await fs.pathExists(file.path);
    if (!srcPathCheck) throw new Error(`Missing source file for transfer: ${file.name}.`);

    const destPath = path.join(this.params.path, db);

    await fs.ensureDir(destPath);
    await fs.move(file.path, path.join(destPath, file.name));

    logger.debug(`Task ${this.name}: transfer of '${file.name}' finished.`);
  }
}
