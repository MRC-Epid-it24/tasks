export type Environment = 'development' | 'test' | 'production';

export type AppConfig = {
  env: Environment;
  name: string;
};

const appConfig: AppConfig = {
  env: (process.env.NODE_ENV ?? 'development') as Environment,
  name: process.env.APP_NAME ?? 'Intake24 Tasks',
};

export default appConfig;
