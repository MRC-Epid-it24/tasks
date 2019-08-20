import 'dotenv/config';
import cron from 'node-cron';
import config from './config';
import tasks from './tasks';

config.tasks.forEach(task => {
  cron.schedule(task.cron, () => {
    // eslint-disable-next-line no-new
    const job = new tasks[task.name](...task.params);
    job.run();
  });
});
