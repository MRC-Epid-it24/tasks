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

export type ApiConfig = {
  v3: {
    url: string;
    username: string;
    password: string;
  };
  v4: {
    url: string;
    username: string;
    password: string;
    token: string;
  };
};

const apiConfig: ApiConfig = {
  v3: {
    url: process.env.API_V3_URL || '',
    username: process.env.API_V3_USERNAME || '',
    password: process.env.API_V3_PASSWORD || '',
  },
  v4: {
    url: process.env.API_V4_URL || '',
    username: process.env.API_V4_USERNAME || '',
    password: process.env.API_V4_PASSWORD || '',
    token: process.env.API_V4_ACCESS_TOKEN || '',
  },
};

export default apiConfig;
