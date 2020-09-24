import './bootstrap';
import cron from 'node-cron';
import config from './config';
import logger from './services/logger';
import mailer from './services/mailer';
import tasks from './tasks';

mailer.init();

config.tasks.forEach((task) => {
  cron.schedule(task.cron, async () => {
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

    const { notify } = task;
    if (notify && notify.length) {
      const subject = `${name} (${survey}) | ${result}`;
      await mailer.sendMail({ to: notify, subject, text: message });
    }
  });
});
