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

export type FileSystemConfig = {
  logs: string;
  tmp: string;
};

const fileSystemConfig: FileSystemConfig = {
  logs: process.env.FS_LOGS_DIR || 'logs',
  tmp: process.env.FS_TMP_DIR || 'tmp',
};

export default fileSystemConfig;
