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

import { config } from 'mssql';

export type DBConfig = {
  it24: {
    connectionString: string;
  };
  epid: config;
};

const dbConfig: DBConfig = {
  it24: {
    connectionString: process.env.IT24_DB_URL || '',
  },
  epid: {
    server: process.env.EPID_DB_SERVER || '',
    user: process.env.EPID_DB_USERNAME || '',
    password: process.env.EPID_DB_PASSWORD || '',
    database: process.env.EPID_DB_DATABASE || '',
    port: parseInt(process.env.EPID_DB_PORT ?? '1433', 10),

    requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || `${60 * 1000}`, 10),
    options: {
      cancelTimeout: parseInt(process.env.MSSQL_CANCEL_TIMEOUT || `${60 * 1000}`, 10),
    },
  },
};

export default dbConfig;
