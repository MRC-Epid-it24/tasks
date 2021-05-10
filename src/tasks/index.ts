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

import { config } from 'mssql';
import EXPORT_SURVEY_DATA from './ExportSurveyData';
import UPLOAD_DISPLAY_NAMES from './UploadDisplayNames';
import UPLOAD_PAQ_LINKS from './UploadPAQLinks';

const tasks = { EXPORT_SURVEY_DATA, UPLOAD_DISPLAY_NAMES, UPLOAD_PAQ_LINKS };

export type TaskType = keyof typeof tasks;

export type TaskParameters = {
  survey: string;
  version: string;
};

export interface TaskDBConfig extends config {
  tables: {
    data: string;
    log: string;
  };
}

export type TaskDefinition = {
  name: TaskType;
  cron: string;
  params: TaskParameters;
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
