import 'dotenv/config';
import cron from 'node-cron';
import config from './config';
import tasks from './tasks';

config.tasks.forEach(task => {
  cron.schedule(task.cron, () => {
    tasks[task.name](...task.params);
  });
});
