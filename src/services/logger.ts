/*
    Intake24 Tasks
    Copyright (C) 2021 MRC Epidemiology Unit, University of Cambridge

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import config from '../config/filesystem';

const { dir } = config.logs;

if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const logFormat = format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat
  ),
  transports: [
    new transports.DailyRotateFile({
      dirname: path.resolve(dir),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
    }),
    new transports.DailyRotateFile({
      level: 'error',
      dirname: path.resolve(dir),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
    }),
    new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        logFormat
      ),
    }),
  ],
  exitOnError: false,
});

export default logger;
