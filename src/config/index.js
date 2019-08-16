export default {
  url: process.env.IT24_API_URL || '',

  auth: {
    username: process.env.IT24_USERNAME || '',
    password: process.env.IT24_PASSWORD || ''
  },
  db: {
    user: process.env.MSSQL_USERNAME,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE
  },
  tasks: [
    {
      name: 'EXPORT_SURVEY_DATA',
      cron: '0 8,20 * * *',
      params: ['test_survey']
    }
  ]
};
