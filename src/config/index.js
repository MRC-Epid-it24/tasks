export default {
  api: {
    it24: {
      url: process.env.IT24_API_URL || '',
      username: process.env.IT24_API_USERNAME || '',
      password: process.env.IT24_API_PASSWORD || ''
    }
  },
  db: {
    it24: {
      connectionString: process.env.IT24_DB_URL || ''
    },
    epid: {
      user: process.env.EPID_DB_USERNAME,
      password: process.env.EPID_DB_PASSWORD,
      server: process.env.EPID_DB_SERVER,
      database: process.env.EPID_DB_DATABASE
    }
  },
  tasks: [
    {
      name: 'EXPORT_SURVEY_DATA',
      cron: '*/30 * * * * *',
      params: ['test_survey']
    },
    {
      name: 'UPLOAD_SURVEY_RESPONDENTS',
      cron: '*/30 * * * * *',
      params: ['test_survey']
    }
  ]
};
