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

export type ApiConfig = {
  it24: {
    url: string;
    username: string;
    password: string;
  };
};

const apiConfig: ApiConfig = {
  it24: {
    url: process.env.IT24_API_URL || '',
    username: process.env.IT24_API_USERNAME || '',
    password: process.env.IT24_API_PASSWORD || '',
  },
};

export default apiConfig;
