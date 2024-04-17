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

import process from 'node:process';

export type Environment = 'development' | 'test' | 'production';

export type AppConfig = {
  env: Environment;
  name: string;
};

const appConfig: AppConfig = {
  env: (process.env.NODE_ENV ?? 'development') as Environment,
  name: process.env.APP_NAME ?? 'Intake24 Tasks',
};

export default appConfig;
