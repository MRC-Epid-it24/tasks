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

import { pgDump, createPgPass, removePgPass, Intake24Database } from '@/services/pg-dump';
import logger from '@/services/logger';
import type { Task, TaskDefinition } from '.';

export type PgDumpToSftpTaskParams = {
  database: Intake24Database;
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
    await createPgPass('system');

    const backup = await pgDump('system');

    await removePgPass();

    console.log(backup);

    logger.info(this.message);

    return this.message;
  }
}
