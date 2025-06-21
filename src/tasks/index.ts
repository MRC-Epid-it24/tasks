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
import type {
  DbDumpToLocalTaskParams,
  DbDumpToSftpTaskParams,
} from './db-dumps/index.js';
import type { ExportSurveyTaskParams } from './export-survey-data.js';
import type { ExportSurveySettingsParams } from './export-survey-settings.js';
import type {
  ImportJsonSubmissionsData,
} from './import-json-submissions/index.js';
import type {
  ImportNatCenDataParams,
  UploadDisplayNamesTaskParams,
  UploadPAQLinksTaskParams,
} from './ndns/index.js';
import { DbDumpToLocal, DbDumpToSftp } from './db-dumps/index.js';
import { ExportSurveyData } from './export-survey-data.js';
import { ExportSurveySettings } from './export-survey-settings.js';
import { ImportJsonSubmissions } from './import-json-submissions/index.js';
import {
  ImportNatCenData,
  UploadDisplayNames,
  UploadPAQLinks,
} from './ndns/index.js';

export type TaskParams = ExportSurveyTaskParams
  | DbDumpToLocalTaskParams
  | DbDumpToSftpTaskParams
  | ExportSurveySettingsParams
  | ImportJsonSubmissionsData
  | ImportNatCenDataParams
  | UploadDisplayNamesTaskParams
  | UploadPAQLinksTaskParams;

export type TaskOutput = {
  message: string;
  attachments?: SendMailOptions['attachments'];
};

export type TaskIOParams = {
  DbDumpToLocal: {
    input: DbDumpToLocalTaskParams;
    output: TaskOutput;
  };
  DbDumpToSftp: {
    input: DbDumpToSftpTaskParams;
    output: TaskOutput;
  };
  ExportSurveyData: {
    input: ExportSurveyTaskParams;
    output: TaskOutput & { surveyCode: string };
  };
  ExportSurveySettings: {
    input: ExportSurveySettingsParams;
    output: TaskOutput;
  };
  ImportJsonSubmissions: {
    input: ImportJsonSubmissionsData;
    output: TaskOutput;
  };
  ImportNatCenData: {
    input: ImportNatCenDataParams;
    output: TaskOutput;
  };
  UploadDisplayNames: {
    input: UploadDisplayNamesTaskParams;
    output: TaskOutput;
  };
  UploadPAQLinks: {
    input: UploadPAQLinksTaskParams;
    output: TaskOutput;
  };
};

export type TaskType = keyof TaskIOParams;

export interface TaskDBConfig extends config {
  tables: {
    data: string;
    log: string;
  };
}

export type TaskDefinition<T extends keyof TaskIOParams = keyof TaskIOParams> = {
  name: T;
  cron: string | false;
  params: TaskIOParams[T]['input'];
  db?: TaskDBConfig;
  notify?:
    | false
    | {
      success?: string[];
      error?: string[];
    }
    | string[];
};

export interface Task<T extends keyof TaskIOParams> {
  readonly name: T;
  readonly params: TaskIOParams[T]['input'];
  output: TaskIOParams[T]['output'];
  run: () => Promise<TaskIOParams[T]['output']>;
}

const tasks = {
  DbDumpToLocal,
  DbDumpToSftp,
  ExportSurveyData,
  ExportSurveySettings,
  ImportJsonSubmissions,
  ImportNatCenData,
  UploadDisplayNames,
  UploadPAQLinks,
};

export type Tasks = {
  [T in TaskType]: new (taskDef: TaskDefinition<T>) => (typeof tasks)[T];
};

export default tasks;
