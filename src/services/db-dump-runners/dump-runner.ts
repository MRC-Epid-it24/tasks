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

import { execaCommand } from 'execa';
import fs from 'fs-extra';
import os from 'node:os';

import type { Dialect, DumpConfig } from '@/config/db.js';
import type { FileInfo } from '@/types/index.js';
import logger from '@/services/logger.js';

export type DumpRunnerOps = {
  instance: string;
  dialect: Dialect;
  dbName: string;
};

export default abstract class DumpRunner {
  readonly config;

  readonly options;

  readonly homeDir: string;

  abstract passEnv: string;

  abstract passFile: string;

  abstract passPath: string;

  constructor(config: DumpConfig, options: DumpRunnerOps) {
    this.config = config;
    this.options = options;
    this.homeDir = os.homedir();
  }

  abstract getPassContent(): string;

  async writePass(): Promise<void> {
    await fs.writeFile(this.passPath, this.getPassContent());
    await execaCommand(`chmod 600 ${this.passFile}`, { cwd: this.homeDir });
  }

  async removePass(): Promise<void> {
    try {
      await fs.unlink(this.passPath);
    }
    catch {
      logger.warn(`${this.constructor.name}|removePass: could not remove: ${this.passPath}`);
    }
  }

  abstract run(): Promise<FileInfo>;
}
