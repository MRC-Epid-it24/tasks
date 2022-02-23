export type Dictionary<T = any> = { [key: string]: T };

export type FileInfo = {
  name: string;
  path: string;
};

export type Intake24Database = 'system' | 'foods';

export type DatabaseBackupOptions = {
  name: string;
  maxAge?: string;
};
