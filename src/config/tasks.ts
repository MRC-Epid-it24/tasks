import type { TaskDefinition } from '@/tasks';

export default [
  {
    name: 'EXPORT_SURVEY_DATA',
    cron: '* * * * *',
    params: {
      survey: 'demo',
      version: 'v2',
    },
    db: {
      database: '',
      tables: {
        data: 'tblIntake24Import',
        log: 'tblImportLogAuto',
      },
    },
    notify: {
      success: [] as string[],
      error: [] as string[],
    },
  },
  {
    name: 'UPLOAD_DISPLAY_NAMES',
    cron: '* * * * *',
    params: {
      survey: 'demo',
    },
    db: {
      database: '',
    },
    notify: {
      success: [] as string[],
      error: [] as string[],
    },
  },
] as TaskDefinition[];
