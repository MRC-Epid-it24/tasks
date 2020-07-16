import { TaskDefinition } from '@/tasks/Task';

export default [
  {
    name: 'EXPORT_SURVEY_DATA',
    cron: '* * * * *',
    params: {
      survey: 'demo',
      version: 'v2',
    },
    db: {
      user: '',
      password: '',
      server: '',
      database: '',
      port: 1433,
      requestTimeout: 300000,
      options: { cancelTimeout: 300000 },
      tables: {
        data: '',
        log: '',
      },
    },
  },
  /* {
    name: 'UPLOAD_DISPLAY_NAMES',
    cron: '* * * * *',
    params: {
      survey: 'demo',
    },
  }, */
] as TaskDefinition[];
