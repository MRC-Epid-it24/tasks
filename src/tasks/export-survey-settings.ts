/*
    Intake24 Tasks
    Copyright (C) 2021-2023 MRC Epidemiology Unit, University of Cambridge

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

import type { PoolClient } from 'pg';
import { AsyncParser } from '@json2csv/node';
import { format } from 'date-fns';
import fs from 'fs-extra';
import { resolve } from 'path';

import fsConfig from '@/config/filesystem';
import { db } from '@/services';

import type { Task, TaskDefinition } from '.';

export type ExtractStudyDataParams = Record<string, never>;

export type SurveyRow = {
  id: string;
  start_date: Date;
  end_date: Date;
};

export default class ExtractStudyData implements Task<ExtractStudyDataParams> {
  readonly name: string;

  readonly params: ExtractStudyDataParams;

  protected pgClient!: PoolClient;

  public message = '';

  constructor(taskDef: TaskDefinition<ExtractStudyDataParams>) {
    const { name, params } = taskDef;
    this.name = name;
    this.params = params;
  }

  async run() {
    this.pgClient = await db.v3.system.getPool().connect();

    try {
      const attachments = await this.fetchData();
      return { message: `Task ${this.name}: Survey data exported.`, attachments };
    } finally {
      this.pgClient.release();
    }
  }

  private async fetchData() {
    const data = await this.pgClient.query(
      `SELECT id, start_date, end_date FROM surveys WHERE end_date > $1 ORDER BY start_date ASC;`,
      [new Date()]
    );

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = `surveys-settings-${timestamp}.csv`;
    const path = resolve(fsConfig.tmp, filename);

    const csv = await new AsyncParser({
      fields: [
        { label: 'SurveyID', value: 'id' },
        {
          label: 'StarDate',
          value: (row: SurveyRow) => format(row.start_date, 'yyyy-MM-dd HH:mm:ss'),
        },
        {
          label: 'EndDate',
          value: (row: SurveyRow) => format(row.end_date, 'yyyy-MM-dd HH:mm:ss'),
        },
      ],
    })
      .parse(data.rows)
      .promise();
    await fs.writeFile(path, csv, { encoding: 'utf8', flag: 'w+' });

    return [{ contentType: 'text/csv', path, filename }];
  }
}
