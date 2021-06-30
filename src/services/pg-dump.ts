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

import { format } from 'date-fns';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PgConfig } from '@/config/db';
import logger from '@/services/logger';
import { FileInfo, Intake24Database } from '@/types';

const PG_DUMP_BIN = '/usr/bin/pg_dump';
const PG_PASS_FILE = '.pgpass';

export type PgDumpOps = {
  db: Intake24Database;
  connection: PgConfig;
  tmp?: string;
};

export type PgDump = {
  createPgPass: () => Promise<void>;
  removePgPass: () => Promise<void>;
  runDump: () => Promise<FileInfo>;
};

export default ({ db, connection, tmp = 'tmp' }: PgDumpOps): PgDump => {
  const pgPassPath = path.resolve(os.homedir(), PG_PASS_FILE);

  const createPgPass = async (): Promise<void> => {
    const { host, port, database, user, password } = connection;
    const pgPassContent = [host, port, database, user, password].join(':');

    await fs.writeFile(pgPassPath, pgPassContent);
    await execa.command(`chmod 600 .pgpass`, { cwd: os.homedir() });
  };

  const removePgPass = async (): Promise<void> => {
    try {
      fs.unlink(pgPassPath);
    } catch (err) {
      logger.warn(`removePgPassSetup: could not remove: ${pgPassPath}`);
    }
  };

  const runDump = async (): Promise<FileInfo> => {
    const { host, port, database, user } = connection;

    const fileName = `intake24-${db}-${format(new Date(), 'yyyyMMdd-HHmmss')}.custom`;
    const filePath = path.resolve(tmp, fileName);

    await execa.command(
      `${PG_DUMP_BIN} --host=${host} --port=${port} --username=${user} --dbname=${database} --format=c --schema=public --no-owner --file=${filePath}`
    );

    return { name: fileName, path: filePath };
  };

  return { createPgPass, removePgPass, runDump };
};
