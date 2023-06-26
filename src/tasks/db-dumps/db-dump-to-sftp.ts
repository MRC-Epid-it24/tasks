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

import fs from 'fs-extra';
import { trimEnd } from 'lodash';
import Sftp from 'ssh2-sftp-client';

import type { DatabaseBackupOptions, FileInfo } from '@/types';
import dbConfig from '@/config/db';
import { dumpRunners, logger } from '@/services';

import type { Task, TaskDefinition } from '..';
import type { DbDumpBase } from './db-dump';

export interface DbDumpToSftpTaskParams extends DbDumpBase {
  sftp: {
    host: string;
    port: number;
    username: string;
    password: string;
    dir: string;
  };
}

export default class DbDumpToSftp implements Task<DbDumpToSftpTaskParams> {
  readonly name: string;

  readonly params: DbDumpToSftpTaskParams;

  public message = '';

  constructor({ name, params }: TaskDefinition<DbDumpToSftpTaskParams>) {
    this.name = name;
    this.params = params;
  }

  /**
   * Run the job
   *
   * @returns {Promise<string>}
   * @memberof DbDumpToSftp
   */
  async run(): Promise<string> {
    const { instance, dialect } = this.params;
    const config = dbConfig.backup[dialect];

    const databases: DatabaseBackupOptions[] = Array.isArray(this.params.database)
      ? this.params.database.map((database) =>
          typeof database === 'string' ? { name: database } : database
        )
      : [{ name: this.params.database }];

    for (const database of databases) {
      const { name: dbName } = database;

      const runner = new dumpRunners[dialect](config, { instance, dialect, dbName });

      const backup = await runner.run();

      await this.copyToSftp(backup);
    }

    this.message = `Task ${this.name}: Database backup successful.`;
    logger.info(this.message);
    return this.message;
  }

  /**
   * Transfer file to SFTP
   *
   * @private
   * @param {FileInfo} file
   * @returns {Promise<void>}
   * @memberof DbDumpToSftp
   */
  private async copyToSftp(file: FileInfo): Promise<void> {
    logger.debug(`Task ${this.name}: transfer to SFTP started.`);

    const fileCheck = await fs.pathExists(file.path);
    if (!fileCheck) throw new Error(`Missing file to upload: ${file.name}.`);

    const { dir, ...sftpConnection } = this.params.sftp;

    const sftp = new Sftp();
    await sftp.connect(sftpConnection);

    const cwd = await sftp.cwd();
    const dirPath = `${trimEnd(cwd, '/')}/${dir}`;

    const dirCheck = await sftp.exists(dirPath);
    if (!dirCheck) {
      await sftp.end();
      throw new Error(`Missing remote directory for upload: ${dirPath}`);
    }

    const stream = fs.createReadStream(file.path);
    const done = await sftp.put(stream, `${dirPath}/${file.name}`);
    await fs.remove(file.path);
    await sftp.end();

    logger.debug(done);
    logger.debug(`Task ${this.name}: transfer to SFTP finished.`);
  }
}
