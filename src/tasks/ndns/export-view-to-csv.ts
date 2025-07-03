import type { Duplex } from 'node:stream';
import type { Task, TaskDefinition } from '../index.js';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { string as stringFormatter } from '@json2csv/formatters';
import { Transform } from '@json2csv/node';
import { format } from 'date-fns';
import Sftp from 'ssh2-sftp-client';
import fsConfig from '@/config/filesystem.js';
import { logger } from '@/services/index.js';
import { HasMsSqlPool } from '../has-mssql-pool.js';

export type ExportViewToCSVParams = {
  sftp: {
    host: string;
    port: number;
    username: string;
    password: string;
    file: string;
  };
  view: string;
};

export class ExportViewToCSV extends HasMsSqlPool implements Task<'ExportViewToCSV'> {
  readonly name = 'ExportViewToCSV';
  readonly params: ExportViewToCSVParams;
  public output = {
    message: '',
  };

  constructor(taskDef: TaskDefinition<'ExportViewToCSV'>) {
    super(taskDef);

    this.params = taskDef.params;
  }

  async run() {
    await this.initMSPool();

    const destFile = this.getDestinationFilename();
    const localeFile = resolve(fsConfig.tmp, basename(destFile));

    await this.exportDataToCSV(localeFile);
    await this.transferToSftp(localeFile, destFile);
    await unlink(localeFile);

    await this.closeMSPool();

    this.output.message = `Task ${this.name}: Exported data to SFTP at ${destFile}.`;

    logger.info(this.output.message);

    return this.output;
  }

  private getDestinationFilename() {
    const today = new Date();
    const date = format(today, 'yyyy-MM-dd');
    const amPm = today.getHours() < 12 ? 'am' : 'pm';

    return this.params.sftp.file.replace('{date}', date).replace('{amPm}', amPm);
  }

  private async getHeaders() {
    const { recordset } = await this.msPool.query<{ name: string }>(`SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('dbo.${this.params.view}')`);

    return recordset.map(row => row.name);
  }

  private async exportDataToCSV(file: string): Promise<void> {
    logger.debug(`Task ${this.name}: Data export started.`);

    const fields = await this.getHeaders();

    return new Promise((resolve, reject) => {
      const request = this.msPool.request();
      request.stream = true;
      request.query(`SELECT * FROM ${this.params.view}`);

      const transform = new Transform(
        {
          fields,
          withBOM: true,
          formatters: {
            string: stringFormatter({ quote: '' }),
          },
        },
        {},
        { objectMode: true },
      );

      const output = createWriteStream(file, { encoding: 'utf8', flags: 'w+' });

      request.on('error', (err) => {
        reject(err);
      });

      transform.on('error', (err) => {
        reject(err);
      });

      output
        .on('error', (err) => {
          reject(err);
        })
        .on('finish', () => {
          logger.debug(`Task ${this.name}: Data export finished.`);
          resolve();
        });

      (request.pipe(transform) as Duplex).pipe(output);
    });
  }

  private async transferToSftp(src: string, dest: string) {
    const { file, ...sftpConnection } = this.params.sftp;

    logger.debug(`Task ${this.name}: File transfer to SFTP server started.`);

    const sftp = new Sftp();
    try {
      await sftp.connect(sftpConnection);
      await sftp.put(createReadStream(src), dest);

      logger.debug(`Task ${this.name}: File transfer to SFTP server finished.`);
    }
    finally {
      await sftp.end();
    }
  }
}
