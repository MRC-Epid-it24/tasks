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
      params: {
        survey: 'demo',
        version: 'v2'
      }
    },
    {
      name: 'UPLOAD_DISPLAY_NAMES',
      cron: '*/30 * * * * *',
      params: {
        survey: 'demo'
      }
    }
  ]
};
