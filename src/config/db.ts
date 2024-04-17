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

import type { config as MSSQLConfig } from 'mssql';
import type { ConnectionConfig } from 'pg';
import process from 'node:process';

export type Dialect = 'postgres' | 'mariadb' | 'mysql';

export type DumpConfig = {
  bin: string;
  connection: ConnectionConfig;
};

export type DBConfig = {
  backup: Record<Dialect, DumpConfig>;
  v3Foods: ConnectionConfig;
  v3System: ConnectionConfig;
  v4Foods: ConnectionConfig;
  v4System: ConnectionConfig;
  epid: MSSQLConfig;
};

const dbConfig: DBConfig = {
  backup: {
    postgres: {
      bin: process.env.PG_BIN || '/usr/bin/pg_dump',
      connection: {
        host: process.env.PG_HOST || 'localhost',
        user: process.env.PG_USERNAME || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        database: process.env.PG_DATABASE || 'postgres',
        port: Number.parseInt(process.env.PG_PORT ?? '5432', 10),
      },
    },
    mariadb: {
      bin: process.env.MARIADB_BIN || '/usr/bin/mysqldump',
      connection: {
        host: process.env.MARIADB_HOST || 'localhost',
        user: process.env.MARIADB_USERNAME || 'mysql',
        password: process.env.MARIADB_PASSWORD || 'mysql',
        database: process.env.MARIADB_DATABASE || 'mysql',
        port: Number.parseInt(process.env.MARIADB_PORT ?? '3306', 10),
      },
    },
    mysql: {
      bin: process.env.MYSQL_BIN || '/usr/bin/mysqldump',
      connection: {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USERNAME || 'mysql',
        password: process.env.MYSQL_PASSWORD || 'mysql',
        database: process.env.MYSQL_DATABASE || 'mysql',
        port: Number.parseInt(process.env.MYSQL_PORT ?? '3306', 10),
      },
    },
  },
  v3Foods: {
    connectionString: process.env.IT24_V3_DB_FOODS_URL || '',
  },
  v3System: {
    connectionString: process.env.IT24_V3_DB_SYSTEM_URL || '',
  },
  v4Foods: {
    connectionString: process.env.IT24_V4_DB_FOODS_URL || '',
  },
  v4System: {
    connectionString: process.env.IT24_V4_DB_SYSTEM_URL || '',
  },
  epid: {
    server: process.env.MSSQL_DB_SERVER || 'localhost',
    user: process.env.MSSQL_DB_USERNAME || 'intake24',
    password: process.env.MSSQL_DB_PASSWORD || '',
    database: process.env.MSSQL_DB_DATABASE || '',
    port: Number.parseInt(process.env.MSSQL_DB_PORT ?? '1433', 10),

    requestTimeout: Number.parseInt(process.env.MSSQL_REQUEST_TIMEOUT || `${60 * 1000}`, 10),
    options: {
      cancelTimeout: Number.parseInt(process.env.MSSQL_CANCEL_TIMEOUT || `${60 * 1000}`, 10),
      encrypt: false,
    },
  },
};

export default dbConfig;
