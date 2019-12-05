import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import config from '../config/filesystem';

const { logs } = config;

if (!fs.existsSync(logs)) fs.mkdirSync(logs);

const logFormat = format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    logFormat
  ),
  transports: [
    new transports.DailyRotateFile({
      dirname: path.resolve(logs),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d'
    }),
    new transports.DailyRotateFile({
      level: 'error',
      dirname: path.resolve(logs),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d'
    }),
    new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        logFormat
      )
    })
  ],
  exitOnError: false
});

export default logger;
