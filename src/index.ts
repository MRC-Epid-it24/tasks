import 'dotenv/config';
import cron from 'node-cron';
import config from './config';
import logger from './services/logger';
import tasks from './tasks';

config.tasks.forEach((task) => {
  cron.schedule(task.cron, () => {
    logger.info(`Task ${task.name} started.`);

    new tasks[task.name](task)
      .run()
      .then(() => {
        logger.info(`Task ${task.name} successfully processed.`);
      })
      .catch((err: Error) => {
        logger.error(`Task ${task.name} failed with: ${err.message}`);
        logger.error(err.stack);
      });
  });
});
