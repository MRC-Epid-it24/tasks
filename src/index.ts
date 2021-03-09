import './bootstrap';
import cron from 'node-cron';
import config from './config';
import mailer from './services/mailer';
import runner from './runner';

mailer.init();

config.tasks.forEach((task) => {
  cron.schedule(task.cron, runner(task));
});
