import logger from './services/logger';
import mailer from './services/mailer';
import tasks, { TaskDefinition } from './tasks';

export type Runner = () => Promise<void>;

export default (task: TaskDefinition): Runner => async () => {
  const {
    name,
    params: { survey },
  } = task;

  logger.info(`Task ${name} started.`);

  let message;
  let result;

  try {
    message = await new tasks[name](task).run();
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
    `Survey: ${survey}\n`,
    `Result: ${result}`,
    `Message: ${message}`,
  ].join('\n');

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
