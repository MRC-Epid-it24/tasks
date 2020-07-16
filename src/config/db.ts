export default {
  it24: {
    connectionString: process.env.IT24_DB_URL || '',
  },
  epid: {
    user: process.env.EPID_DB_USERNAME || '',
    password: process.env.EPID_DB_PASSWORD || '',
    server: process.env.EPID_DB_SERVER || '',
    database: process.env.EPID_DB_DATABASE || '',
    port: parseInt(process.env.EPID_DB_PORT ?? '1433', 10),

    requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || `${60 * 1000}`, 10),
    options: {
      cancelTimeout: parseInt(process.env.MSSQL_CANCEL_TIMEOUT || `${60 * 1000}`, 10),
    },
  },
};
