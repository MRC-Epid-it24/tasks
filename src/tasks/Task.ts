import sql, { config, ConnectionPool } from 'mssql';
import globalDB from '../config/db';

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

export type TaskParameters = {
  survey: string;
  version: string;
};

export type TaskType = 'EXPORT_SURVEY_DATA' | 'UPLOAD_DISPLAY_NAMES';

export type Tasks = Record<TaskType, TaskConstructor>;

export interface TaskConstructor {
  new (TaskDefinition: TaskDefinition): Task;
}

export abstract class Task {
  readonly name: string;

  readonly params: TaskParameters;

  readonly dbConfig: TaskDBConfig;

  protected pool!: ConnectionPool;

  abstract message: string;

  abstract run(): Promise<string>;

  constructor({ name, params, db }: TaskDefinition) {
    this.name = name;
    this.params = params;

    if (!db) throw Error('No database connection info provided.');

    this.dbConfig = { ...globalDB.epid, ...db };
  }

  /**
   * Open DB connection pool
   *
   * @return void
   */
  protected async initDB(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tables, ...rest } = this.dbConfig;

    this.pool = new sql.ConnectionPool(rest);
    await this.pool.connect();
  }

  /**
   * Close DB connection pool
   *
   * @return void
   */
  protected async closeDB(): Promise<void> {
    await this.pool.close();
  }
}
