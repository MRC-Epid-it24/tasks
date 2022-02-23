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

import fs from 'fs';
import path from 'path';
import fsConfig from '@/config/filesystem';

class Storage {
  public cwd: string;

  public dir: string;

  constructor() {
    this.cwd = fsConfig.tmp;
    this.dir = this.tap();
  }

  /**
   * Verify that temporary directory exists
   *
   * @return String
   */
  tap(...segments: string[]) {
    const dir = path.resolve(this.cwd, ...segments);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return dir;
  }

  /**
   * Save data to file at temporary location
   *
   * @param String filename
   * @param String data
   *
   * @return String
   */
  save(filename: string, data: string) {
    const file = path.resolve(this.cwd, filename);
    fs.appendFileSync(file, data);

    return file;
  }
}

export default new Storage();
