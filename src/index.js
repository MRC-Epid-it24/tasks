import 'dotenv/config';
import cron from 'node-cron';
import config from './config';
import tasks from './tasks';
import logger from './services/logger';

config.tasks.forEach(task => {
  cron.schedule(task.cron, () => {
    logger.info(`Task ${task.name} started.`);

    new tasks[task.name](task.params)
      .run()
      .then(() => {
        logger.info(`Task ${task.name} successfully processed.`);
      })
      .catch(err => {
        logger.error(`Task ${task.name} failed with: ${err.message}`);
        logger.error(err.stack);
      });
  });
});
