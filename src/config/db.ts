import { config } from 'mssql';

export type DBConfig = {
  it24: {
    connectionString: string;
  };
  epid: config;
};

const dbConfig: DBConfig = {
  it24: {
    connectionString: process.env.IT24_DB_URL || '',
  },
  epid: {
    server: process.env.EPID_DB_SERVER || '',
    user: process.env.EPID_DB_USERNAME || '',
    password: process.env.EPID_DB_PASSWORD || '',
    database: process.env.EPID_DB_DATABASE || '',
    port: parseInt(process.env.EPID_DB_PORT ?? '1433', 10),

    requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || `${60 * 1000}`, 10),
    options: {
      cancelTimeout: parseInt(process.env.MSSQL_CANCEL_TIMEOUT || `${60 * 1000}`, 10),
    },
  },
};

export default dbConfig;
