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

import type { config } from 'mssql';
import type { SendMailOptions } from 'nodemailer';

import type { Dictionary } from '@/types/index.js';

import { DB_DUMP_TO_LOCAL, DB_DUMP_TO_SFTP } from './db-dumps/index.js';
import EXPORT_SURVEY_DATA from './export-survey-data.js';
import EXPORT_SURVEY_SETTINGS from './export-survey-settings.js';
import { IMPORT_JSON_SUBMISSIONS } from './import-json-submissions/index.js';
import UPLOAD_DISPLAY_NAMES from './upload-display-names.js';
import UPLOAD_PAQ_LINKS from './upload-paq-links.js';

const tasks = {
  EXPORT_SURVEY_DATA,
  EXPORT_SURVEY_SETTINGS,
  IMPORT_JSON_SUBMISSIONS,
  DB_DUMP_TO_LOCAL,
  DB_DUMP_TO_SFTP,
  UPLOAD_DISPLAY_NAMES,
  UPLOAD_PAQ_LINKS,
};

export type TaskType = keyof typeof tasks;

export type TaskOutput = {
  message: string;
  attachments?: SendMailOptions['attachments'];
};

export interface Task<T = Dictionary> {
  readonly name: string;
  readonly params: T;
  message: string;
  run: () => Promise<TaskOutput>;
}

export interface TaskDBConfig extends config {
  tables: {
    data: string;
    log: string;
  };
}

export type TaskDefinition<T = Dictionary> = {
  name: TaskType;
  cron: string | false;
  params: T;
  db?: TaskDBConfig;
  notify?:
    | false
    | {
      success?: string[];
      error?: string[];
    }
    | string[];
};

export type Tasks = {
  [P in TaskType]: new (taskDef: TaskDefinition) => (typeof tasks)[P];
};

export default tasks;
