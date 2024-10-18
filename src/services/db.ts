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

import type { ConnectionConfig } from 'pg';
import TYPES from 'mssql';
import pg from 'pg';

import dbConfig from '@/config/db.js';

function pgPool(config: ConnectionConfig) {
  let pool: pg.Pool | null = null;

  const getPool = () => {
    if (pool)
      return pool;

    pool = new pg.Pool(config);
    return pool;
  };

  return { getPool };
}

export const db = {
  v3: { foods: pgPool(dbConfig.v3Foods), system: pgPool(dbConfig.v3System) },
  v4: { foods: pgPool(dbConfig.v4Foods), system: pgPool(dbConfig.v4System) },
};

export const msSqlTypes = {
  varchar: TYPES.VarChar,
  nvarchar: TYPES.NVarChar,
  text: TYPES.Text,
  int: TYPES.Int,
  bigint: TYPES.BigInt,
  tinyint: TYPES.TinyInt,
  smallint: TYPES.SmallInt,
  bit: TYPES.Bit,
  float: TYPES.Float,
  numeric: TYPES.Numeric,
  decimal: TYPES.Decimal,
  real: TYPES.Real,
  date: TYPES.Date,
  datetime: TYPES.DateTime,
  datetime2: TYPES.DateTime2,
  datetimeoffset: TYPES.DateTimeOffset,
  smalldatetime: TYPES.SmallDateTime,
  time: TYPES.Time,
  uniqueidentifier: TYPES.UniqueIdentifier,
  smallmoney: TYPES.SmallMoney,
  money: TYPES.Money,
  binary: TYPES.Binary,
  varbinary: TYPES.VarBinary,
  image: TYPES.Image,
  xml: TYPES.Xml,
  char: TYPES.Char,
  nchar: TYPES.NChar,
  ntext: TYPES.NText,
  tvp: TYPES.TVP,
  udt: TYPES.UDT,
  geography: TYPES.Geography,
  geometry: TYPES.Geometry,
  variant: TYPES.Variant,
};
