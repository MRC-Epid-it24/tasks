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

import type { Task, TaskDefinition } from '../index.js';
import type { DbDumpBase } from './db-dump.js';
import path from 'node:path';
import { parse } from 'date-fns';

import fs from 'fs-extra';
import ms from 'ms';
import dbConfig from '@/config/db.js';

import { dumpRunners, logger } from '@/services/index.js';
import type { DatabaseBackupOptions, FileInfo } from '@/types/index.js';

export interface DbDumpToLocalTaskParams extends DbDumpBase {
  basePath: string;
  appendPath?: string;
}

export default class DbDumpToLocal implements Task<DbDumpToLocalTaskParams> {
  readonly name: string;

  readonly params: DbDumpToLocalTaskParams;

  public message = '';

  constructor({ name, params }: TaskDefinition<DbDumpToLocalTaskParams>) {
    this.name = name;
    this.params = params;
  }

  async run() {
    const { instance, dialect } = this.params;
    const config = dbConfig.backup[dialect];

    const databases: DatabaseBackupOptions[] = Array.isArray(this.params.database)
      ? this.params.database.map(database =>
          typeof database === 'string' ? { name: database } : database,
        )
      : [{ name: this.params.database }];

    for (const database of databases) {
      const { name: dbName, maxAge = this.params.maxAge } = database;

      const runner = new dumpRunners[dialect](config, { instance, dialect, dbName });

      const backup = await runner.run();
      await this.copyToDestination(dbName, backup);

      if (maxAge)
        await this.cleanOldBackups(dbName, ms(maxAge));
    }

    this.message = `Task ${this.name}: Database backup successful.`;
    const { message } = this;
    logger.info(message);

    return { message };
  }

  /**
   * Transfer file to its destination
   *
   * @private
   * @param {string} dbName
   * @param {FileInfo} file
   * @returns {Promise<void>}
   * @memberof DbDumpToSftp
   */
  private async copyToDestination(dbName: string, file: FileInfo): Promise<void> {
    logger.debug(`Task ${this.name}: transfer of '${file.name}' started.`);

    const srcPathCheck = await fs.pathExists(file.path);
    if (!srcPathCheck)
      throw new Error(`Missing source file for transfer: ${file.name}.`);

    const destPath = path.join(this.params.basePath, dbName, this.params.appendPath ?? '');

    await fs.ensureDir(destPath);
    await fs.move(file.path, path.join(destPath, file.name));

    logger.debug(`Task ${this.name}: transfer of '${file.name}' finished.`);
  }

  /**
   * Cleanup old database backup files
   *
   * @private
   * @param {string} dbName
   * @param {number} maxAge
   * @returns {Promise<void>}
   * @memberof DbDumpToSftp
   */
  private async cleanOldBackups(dbName: string, maxAge: number): Promise<void> {
    logger.debug(`Task ${this.name}: cleanup of '${dbName}' started.`);

    const today = new Date();
    const todayInMs = today.getTime();

    const destPath = path.join(this.params.basePath, dbName, this.params.appendPath ?? '');
    const dirContent = await fs.readdir(destPath);

    for (const file of dirContent) {
      const dateTimePattern = file.match(/\d{8}-\d{6}/g);
      if (!dateTimePattern || !dateTimePattern.length)
        continue;

      const fileDate = parse(dateTimePattern[0], 'yyyyMMdd-HHmmss', today);
      const fileAgeInMs = fileDate.getTime() + maxAge;

      if (fileAgeInMs < todayInMs)
        await fs.unlink(path.join(destPath, file));
    }

    logger.debug(`Task ${this.name}: cleanup of '${dbName}' finished.`);
  }
}
