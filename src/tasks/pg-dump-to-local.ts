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

import { parse } from 'date-fns';
import fs from 'fs-extra';
import ms from 'ms';
import path from 'path';
import dbConfig from '@/config/db';
import pgDump from '@/services/pg-dump';
import logger from '@/services/logger';
import { FileInfo, Intake24Database } from '@/types';
import type { Task, TaskDefinition } from '.';

export type Intake24DatabaseWithRetention = {
  name: Intake24Database;
  maxAge?: string;
};

export type PgDumpToLocalTaskParams = {
  database: Intake24Database | Intake24Database[] | Intake24DatabaseWithRetention[];
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
   * @memberof PgDumpToLocal
   */
  async run(): Promise<string> {
    const databases: Intake24DatabaseWithRetention[] = Array.isArray(this.params.database)
      ? this.params.database.map((database) =>
          typeof database === 'string' ? { name: database } : database
        )
      : [{ name: this.params.database }];

    for (const database of databases) {
      const { name, maxAge } = database;

      const pgBackup = pgDump({ dbType: name, connection: dbConfig[name] });

      await pgBackup.createPgPass();
      const backup = await pgBackup.runDump();
      await pgBackup.removePgPass();

      await this.copyToDestination(name, backup);

      if (maxAge) await this.cleanOldBackups(name, ms(maxAge));
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
   * @memberof PgDumpToLocal
   */
  private async copyToDestination(dbType: Intake24Database, file: FileInfo): Promise<void> {
    logger.debug(`Task ${this.name}: transfer of '${file.name}' started.`);

    const srcPathCheck = await fs.pathExists(file.path);
    if (!srcPathCheck) throw new Error(`Missing source file for transfer: ${file.name}.`);

    const destPath = path.join(this.params.path, dbType);

    await fs.ensureDir(destPath);
    await fs.move(file.path, path.join(destPath, file.name));

    logger.debug(`Task ${this.name}: transfer of '${file.name}' finished.`);
  }

  /**
   *
   *
   * @private
   * @param {Intake24Database} dbType
   * @param {number} maxAge
   * @returns {Promise<void>}
   * @memberof PgDumpToLocal
   */
  private async cleanOldBackups(dbType: Intake24Database, maxAge: number): Promise<void> {
    logger.debug(`Task ${this.name}: cleanup of '${dbType}' started.`);

    const today = new Date();
    const todayInMs = today.getTime();

    const destPath = path.join(this.params.path, dbType);
    const dirContent = await fs.readdir(destPath);

    for (const file of dirContent) {
      const dateTimePattern = file.match(/[0-9]{8}-[0-9]{6}/gi);
      if (!dateTimePattern || !dateTimePattern.length) continue;

      const fileDate = parse(dateTimePattern[0], 'yyyyMMdd-HHmmss', today);
      const fileAgeInMs = fileDate.getTime() + maxAge;

      if (fileAgeInMs < todayInMs) await fs.unlink(path.join(destPath, file));
    }

    logger.debug(`Task ${this.name}: cleanup of '${dbType}' finished.`);
  }
}
