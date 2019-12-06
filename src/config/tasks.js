export default [
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
];
