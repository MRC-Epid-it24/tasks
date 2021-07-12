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

import logger from './services/logger';
import mailer from './services/mailer';
import tasks, { TaskDefinition } from './tasks';

export type Runner = () => Promise<void>;

export default (task: TaskDefinition): Runner =>
  async () => {
    const {
      name,
      params: { survey },
    } = task;

    logger.info(`Task ${name} started.`);

    let message;
    let result;

    try {
      // TODO: fix the type
      message = await new tasks[name](task as any).run();
      result = 'SUCCESS';

      logger.info(`Task ${name} successfully processed.`);
    } catch (err) {
      message = err.message;
      result = 'ERROR';

      logger.error(`Task ${name} failed with: ${err.message}`);
      logger.error(err.stack);
    }

    // Notifications
    const { notify } = task;
    if (!notify) return;

    const subject = `${name} | ${result}`;
    const text = [
      `Task: ${name}`,
      survey ? `Survey: ${survey}\n` : null,
      `Result: ${result}`,
      `Message: ${message}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (Array.isArray(notify) && notify.length) {
      await mailer.sendMail({ to: notify, subject, text });
      return;
    }

    if (!Array.isArray(notify)) {
      const { success, error } = notify;

      if (success && success.length && result === 'SUCCESS')
        await mailer.sendMail({ to: success, subject, text });

      if (error && error.length && result === 'ERROR')
        await mailer.sendMail({ to: error, subject, text });
    }
  };
