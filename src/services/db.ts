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

import { Pool } from 'pg';
import dbConfig, { PgConfig } from '@/config/db';

const pgPool = (config: PgConfig) => {
  let pool: Pool | null = null;

  const getPool = () => {
    if (pool) return pool;

    pool = new Pool(config);
    return pool;
  };

  return { getPool };
};

export default { foods: pgPool(dbConfig.foods), system: pgPool(dbConfig.system) };
