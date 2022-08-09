/*
    Intake24 Tasks
    Copyright (C) 2021-2022 MRC Epidemiology Unit, University of Cambridge

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

import { format } from 'date-fns';
import execa from 'execa';
import path from 'path';

import type { DumpConfig } from '@/config/db';
import type { FileInfo } from '@/types';
import fsConfig from '@/config/filesystem';
import logger from '@/services/logger';

import type { DumpRunnerOps } from './dump-runner';
import DumpRunner from './dump-runner';

export default class MysqlDumpRunner extends DumpRunner {
  readonly passEnv: string;

  readonly passFile: string;

  readonly passPath: string;

  constructor(config: DumpConfig, ops: DumpRunnerOps) {
    super(config, ops);

    this.passEnv = 'MYSQL_PWD';
    this.passFile = '.my.cnf';
    this.passPath = path.resolve(this.homeDir, this.passFile);
  }

  getPassContent(): string {
    const { password } = this.config.connection;
    return ['[mysqldump]', `password=${password}`].join('\n');
  }

  async run(): Promise<FileInfo> {
    const { instance, dbName } = this.options;
    const { bin, connection } = this.config;
    const { user, password } = connection;

    logger.debug(`${this.constructor.name}|run: database dump for '${dbName}' started.`);

    const fileName = `${instance}-${dbName}-${format(new Date(), 'yyyyMMdd-HHmmss')}.sql`;
    const filePath = path.resolve(fsConfig.tmp, fileName);

    // --defaults-file=${this.passPath}
    await execa.command(`${bin} --user=${user} --result-file=${filePath} --databases ${dbName}`, {
      env: { [this.passEnv]: password },
    });

    logger.debug(`${this.constructor.name}|run: database dump for '${dbName}' finished.`);

    return { name: fileName, path: filePath };
  }
}
