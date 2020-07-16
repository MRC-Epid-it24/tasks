export type TaskDefinition = {
  name: TaskType;
  cron: string;
  params: TaskParameters;
};

export type TaskParameters = {
  survey: string;
  version: string;
};

export type TaskType = 'EXPORT_SURVEY_DATA' | 'UPLOAD_DISPLAY_NAMES';

export type Tasks = Record<TaskType, TaskConstructor>;

export interface TaskConstructor {
  new (TaskDefinition: TaskDefinition): Task;
}

export interface Task {
  readonly name: string;

  params: TaskParameters;

  run(): Promise<void>;
}
