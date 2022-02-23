/*
    Intake24 Tasks
    Copyright (C) 2021-2022 MRC Epidemiology Unit, University of Cambridge

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

import './bootstrap';
import { Command } from 'commander';
import pkg from '@@/package.json';
import config from './config';
import runner from './runner';
import mailer from './services/mailer';

const run = async () => {
  const program = new Command();

  program.name('intake24-tasks');
  program.version(pkg.version);
  program.requiredOption('--task-index <index>', 'Index of the task.').action(async (cmd) => {
    const taskIndex = parseInt(cmd.taskIndex, 10);
    if (typeof taskIndex !== 'number') throw new Error('Task index must be a number.');

    if (taskIndex < 0 || taskIndex >= config.tasks.length)
      throw new Error('Task index is out of range.');

    const task = config.tasks[taskIndex];

    mailer.init();

    await runner(task)();

    mailer.close();
  });

  await program.parseAsync(process.argv);
};

run()
  .catch((err) => {
    console.error(err);

    process.exitCode = process.exitCode ?? 1;
    process.exit();
  })
  .finally(() => {
    process.exitCode = process.exitCode ?? 0;
    process.exit();
  });
