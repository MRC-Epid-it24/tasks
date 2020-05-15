export default {
  it24: {
    connectionString: process.env.IT24_DB_URL || '',
  },
  epid: {
    user: process.env.EPID_DB_USERNAME,
    password: process.env.EPID_DB_PASSWORD,
    server: process.env.EPID_DB_SERVER,
    database: process.env.EPID_DB_DATABASE,
  },
};
