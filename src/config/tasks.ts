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

import type { TaskDefinition } from '@/tasks';

export default [
  {
    name: 'EXPORT_SURVEY_DATA',
    cron: '* * * * *',
    params: {
      survey: 'demo',
      version: 'v2',
    },
    db: {
      database: '',
      tables: {
        data: 'tblIntake24Import',
        log: 'tblImportLogAuto',
      },
    },
    notify: {
      success: [] as string[],
      error: [] as string[],
    },
  },
  {
    name: 'UPLOAD_DISPLAY_NAMES',
    cron: '* * * * *',
    params: {
      survey: 'demo',
    },
    db: {
      database: '',
    },
    notify: {
      success: [] as string[],
      error: [] as string[],
    },
  },
] as TaskDefinition[];
