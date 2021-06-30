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
import { trimEnd } from 'lodash';
import Sftp from 'ssh2-sftp-client';
import dbConfig from '@/config/db';
import pgDump from '@/services/pg-dump';
import logger from '@/services/logger';
import { FileInfo, Intake24Database } from '@/types';
import type { Task, TaskDefinition } from '.';

export type PgDumpToSftpTaskParams = {
  database: Intake24Database | Intake24Database[];
  sftp: {
    host: string;
    port: number;
    username: string;
    password: string;
    dir: string;
  };
};

export default class PgDumpToSftp implements Task<PgDumpToSftpTaskParams> {
  readonly name: string;

  readonly params: PgDumpToSftpTaskParams;

  public message = '';

  constructor({ name, params }: TaskDefinition<PgDumpToSftpTaskParams>) {
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
   * @memberof PgDumpToSftp
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
