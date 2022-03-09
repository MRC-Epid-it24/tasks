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
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import dbConfig, { PgConfig } from '@/config/db';
import fsConfig from '@/config/filesystem';
import logger from '@/services/logger';
import { FileInfo } from '@/types';

const PG_PASS_FILE = '.pgpass';

export type PgDumpOps = {
  instance: string;
  dbName: string;
  connection?: PgConfig;
  tmp?: string;
};

const pgDump = (options: PgDumpOps) => {
  const { pg, pgBin } = dbConfig;
  const { instance, dbName, connection = pg, tmp = fsConfig.tmp } = options;

  const pgPassPath = path.resolve(os.homedir(), PG_PASS_FILE);

  const createPgPass = async (): Promise<void> => {
    const { host, port, database, user, password } = connection;
    const pgPassContent = [host, port, database, user, password].join(':');

    await fs.writeFile(pgPassPath, pgPassContent);
    await execa.command(`chmod 600 .pgpass`, { cwd: os.homedir() });
  };

  const removePgPass = async (): Promise<void> => {
    try {
      await fs.unlink(pgPassPath);
    } catch (err) {
      logger.warn(`pgDump|removePgPassSetup: could not remove: ${pgPassPath}`);
    }
  };

  const runDump = async (): Promise<FileInfo> => {
    logger.debug(`pgDump|runDump: pg_dump for '${dbName}' started.`);

    const { host, port, user, password } = connection;

    const fileName = `${instance}-${dbName}-${format(new Date(), 'yyyyMMdd-HHmmss')}.custom`;
    const filePath = path.resolve(tmp, fileName);

    await execa.command(
      `${pgBin} --host=${host} --port=${port} --username=${user} --dbname=${dbName} --format=c --schema=public --no-owner --file=${filePath}`,
      { env: { PGPASSWORD: password } }
    );

    logger.debug(`pgDump|runDump: pg_dump for '${dbName}' finished.`);

    return { name: fileName, path: filePath };
  };

  return { createPgPass, removePgPass, runDump };
};

export default pgDump;

export type PgDump = ReturnType<typeof pgDump>;
