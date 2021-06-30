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

import { Dictionary } from '@/types';
import { config } from 'mssql';
import EXPORT_SURVEY_DATA from './export-survey-data';
import PG_DUMP_TO_SFTP from './pg-dump-to-sftp';
import UPLOAD_DISPLAY_NAMES from './upload-display-names';
import UPLOAD_PAQ_LINKS from './upload-paq-links';

const tasks = {
  UPLOAD_DISPLAY_NAMES,
  PG_DUMP_TO_SFTP,
  EXPORT_SURVEY_DATA,
  UPLOAD_PAQ_LINKS,
};

export type TaskType = keyof typeof tasks;

export interface Task<T = Dictionary> {
  readonly name: string;
  readonly params: T;
  message: string;
  run(): Promise<string>;
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
  [P in TaskType]: new (taskDef: TaskDefinition) => typeof tasks[P];
};

export default tasks;
