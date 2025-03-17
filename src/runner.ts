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
import type { TaskDefinition, TaskOutput } from './tasks/index.js';
import { logger, mailer } from './services/index.js';
import tasks from './tasks/index.js';

export default (task: TaskDefinition) => async () => {
  const {
    name,
    params: { survey },
  } = task;

  logger.info(`Task ${name} started.`);

  let output: TaskOutput;
  let result: 'SUCCESS' | 'ERROR';
  let stack: string | undefined;

  try {
    // TODO: fix the type
    output = await new tasks[name](task as any).run();
    result = 'SUCCESS';

    logger.info(`Task ${name} successfully processed.`);
  }
  catch (err) {
    if (err instanceof Error) {
      output = { message: err.message };
      result = 'ERROR';
      stack = err.stack;

      logger.error(`Task ${name} failed with: ${err.message}`);
      logger.error(err.stack);
    }
    else {
      output = { message: 'Unknown error' };
      result = 'ERROR';

      logger.error(`Task ${name} failed with an unknown error.`);
      logger.error(err);
    }
  }

  // Notifications
  const { notify } = task;
  if (!notify)
    return;

  const { message, attachments } = output;

  const subject = `🚀 ${name} | ${result}`;
  const text = [
    `Task: ${name}`,
    survey ? `Survey: ${survey}\n` : null,
    `Result: ${result}`,
    `Message: ${message}`,
    stack ? `\nStack: ${stack}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (Array.isArray(notify) && notify.length) {
    await mailer.sendMail({ to: notify, subject, text, attachments });
    return;
  }

  if (!Array.isArray(notify)) {
    const { success, error } = notify;

    if (success && success.length && result === 'SUCCESS')
      await mailer.sendMail({ to: success, subject, text, attachments });

    if (error && error.length && result === 'ERROR')
      await mailer.sendMail({ to: error, subject, text, attachments });
  }
};
