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
