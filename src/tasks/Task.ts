import sql, { ConnectionPool } from 'mssql';
import type { TaskDefinition, TaskDBConfig, TaskParameters } from '.';
import globalDB from '../config/db';

export default abstract class Task {
  readonly name: string;

  readonly params: TaskParameters;

  readonly dbConfig: TaskDBConfig;

  protected msPool!: ConnectionPool;

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
  protected async initMSPool(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tables, ...rest } = this.dbConfig;

    this.msPool = new sql.ConnectionPool(rest);
    await this.msPool.connect();
  }

  /**
   * Close DB connection pool
   *
   * @return void
   */
  protected async closeMSPool(): Promise<void> {
    await this.msPool.close();
  }
}
