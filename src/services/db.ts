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
import { Pool } from 'pg';

import dbConfig from '@/config/db';

function pgPool(config: ConnectionConfig) {
  let pool: Pool | null = null;

  const getPool = () => {
    if (pool)
      return pool;

    pool = new Pool(config);
    return pool;
  };

  return { getPool };
}

export const db = {
  v3: { foods: pgPool(dbConfig.v3Foods), system: pgPool(dbConfig.v3System) },
  v4: { foods: pgPool(dbConfig.v4Foods), system: pgPool(dbConfig.v4System) },
};
