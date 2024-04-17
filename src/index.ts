/*
    Intake24 Tasks
    Copyright (C) 2021-2023 MRC Epidemiology Unit, University of Cambridge

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

import './bootstrap';

import cron from 'node-schedule';

import config from './config';
import runner from './runner';
import { logger, mailer } from './services';

mailer.init();

for (const task of config.tasks) {
  if (!task.cron)
    continue;

  const job = cron.scheduleJob(task.cron, runner(task));

  job.on('error', (err) => {
    if (err instanceof Error) {
      const { message, name, stack } = err;
      logger.error(stack ?? `${name}: ${message}`);
    }
    else {
      console.error(err);
    }
  });
}
