import './bootstrap';
import { Command } from 'commander';
import config from './config';
import runner from './runner';
import mailer from './services/mailer';
import pkg from '../package.json';

async function run() {
  const program = new Command();

  program.name('intake24-tasks');
  program.version(pkg.version);
  program.requiredOption('--task-index <index>', 'Index of the task.').action(async (cmd) => {
    const taskIndex = parseInt(cmd.opts().taskIndex, 10);
    if (typeof taskIndex !== 'number') throw new Error('Task index must be a number.');

    if (taskIndex < 0 || taskIndex >= config.tasks.length)
      throw new Error('Task index is out of range.');

    const task = config.tasks[taskIndex];

    mailer.init();

    await runner(task)();

    mailer.close();
  });

  await program.parseAsync(process.argv);
}

run().catch((err) => {
  console.error(err);

  process.exitCode = process.exitCode || 1;
  process.exit();
});
