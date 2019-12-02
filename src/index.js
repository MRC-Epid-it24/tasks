import 'dotenv/config';
import cron from 'node-cron';
import config from './config';
import tasks from './tasks';

config.tasks.forEach(task => {
  cron.schedule(task.cron, () => {
    // eslint-disable-next-line no-new
    new tasks[task.name](task.params)
      .run()
      .then(() => console.log(`Task ${task.name} processed.`))
      .catch(err => console.log(`Task ${task.name} failed: ${err.message}`));
  });
});
