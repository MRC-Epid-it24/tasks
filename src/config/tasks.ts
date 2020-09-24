import { TaskDefinition } from '@/tasks/Task';

export default [
  {
    name: 'EXPORT_SURVEY_DATA',
    cron: '*/30 * * * * *',
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
    notify: ['test@test.com'],
  },
  /* {
    name: 'UPLOAD_DISPLAY_NAMES',
    cron: '* * * * *',
    params: {
      survey: 'demo',
    },
  }, */
] as TaskDefinition[];
