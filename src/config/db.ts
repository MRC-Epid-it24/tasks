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

import { config as MSSQLConfig } from 'mssql';

export type Dialect = 'postgres' | 'mariadb' | 'mysql';

export type ConnConfig = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
};

export type DumpConfig = {
  bin: string;
  connection: ConnConfig;
};

export type DBConfig = {
  backup: Record<Dialect, DumpConfig>;
  foods: ConnConfig;
  system: ConnConfig;
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
        port: parseInt(process.env.PG_PORT ?? '5432', 10),
      },
    },
    mariadb: {
      bin: process.env.MARIADB_BIN || '/usr/bin/mysqldump',
      connection: {
        host: process.env.MARIADB_HOST || 'localhost',
        user: process.env.MARIADB_USERNAME || 'mysql',
        password: process.env.MARIADB_PASSWORD || 'mysql',
        database: process.env.MARIADB_DATABASE || 'mysql',
        port: parseInt(process.env.MARIADB_PORT ?? '3306', 10),
      },
    },
    mysql: {
      bin: process.env.MYSQL_BIN || '/usr/bin/mysqldump',
      connection: {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USERNAME || 'mysql',
        password: process.env.MYSQL_PASSWORD || 'mysql',
        database: process.env.MYSQL_DATABASE || 'mysql',
        port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
      },
    },
  },
  foods: {
    host: process.env.IT24_DB_FOODS_HOST || 'localhost',
    user: process.env.IT24_DB_FOODS_USERNAME || 'intake24',
    password: process.env.IT24_DB_FOODS_PASSWORD || '',
    database: process.env.IT24_DB_FOODS_DATABASE || 'intake24_foods',
    port: parseInt(process.env.IT24_DB_FOODS_PORT ?? '5432', 10),
  },
  system: {
    host: process.env.IT24_DB_SYSTEM_HOST || 'localhost',
    user: process.env.IT24_DB_SYSTEM_USERNAME || 'intake24',
    password: process.env.IT24_DB_SYSTEM_PASSWORD || '',
    database: process.env.IT24_DB_SYSTEM_DATABASE || 'intake24_system',
    port: parseInt(process.env.IT24_DB_SYSTEM_PORT ?? '5432', 10),
  },
  epid: {
    server: process.env.MSSQL_DB_SERVER || 'localhost',
    user: process.env.MSSQL_DB_USERNAME || 'intake24',
    password: process.env.MSSQL_DB_PASSWORD || '',
    database: process.env.MSSQL_DB_DATABASE || '',
    port: parseInt(process.env.MSSQL_DB_PORT ?? '1433', 10),

    requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || `${60 * 1000}`, 10),
    options: {
      cancelTimeout: parseInt(process.env.MSSQL_CANCEL_TIMEOUT || `${60 * 1000}`, 10),
      encrypt: false,
    },
  },
};

export default dbConfig;
