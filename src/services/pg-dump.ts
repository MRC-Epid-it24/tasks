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
import dbConfig from '@/config/db';
import fsConfig from '@/config/filesystem';
import logger from '@/services/logger';

export type Intake24Database = 'system' | 'foods';

export type BackupFile = {
  fileName: string;
  filePath: string;
};

const PG_DUMP_BIN = '/usr/bin/pg_dump';
const PG_PASS_FILE = '.pgpass';

const pgPassPath = path.resolve(os.homedir(), PG_PASS_FILE);

export const createPgPass = async (db: Intake24Database): Promise<void> => {
  const { host, port, database, user, password } = dbConfig[db];
  const pgPassContent = [host, port, database, user, password].join(':');

  await fs.writeFile(pgPassPath, pgPassContent);
  await execa.command(`chmod 600 .pgpass`, { cwd: os.homedir() });
};

export const removePgPass = async (): Promise<void> => {
  try {
    fs.unlink(pgPassPath);
  } catch (err) {
    logger.warn(`removePgPassSetup: could not remove: ${pgPassPath}`);
  }
};

export const pgDump = async (db: Intake24Database): Promise<BackupFile> => {
  const { host, port, database, user } = dbConfig[db];

  const fileName = `intake24-${db}-${format(new Date(), 'yyyyMMdd-HHmmss')}.custom`;

  const filePath = path.resolve(fsConfig.tmp, fileName);

  await execa.command(
    `${PG_DUMP_BIN} --host=${host} --port=${port} --username=${user} --dbname=${database} --format=c --schema=public --no-owner --file=${filePath}`
  );

  return { fileName, filePath };
};
