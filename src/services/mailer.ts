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

import type { SendMailOptions, Transporter } from 'nodemailer';
import process from 'node:process';
import nodemailer from 'nodemailer';

import appConfig from '@/config/app.js';
import type { MailerType } from '@/config/mail.js';
import config from '@/config/mail.js';
import logger from '@/services/logger.js';

class Mailer {
  mailer!: MailerType;

  transporter!: Transporter;

  init(): void {
    const { mailer } = config;
    this.mailer = mailer;

    let options = {};

    const isDev = appConfig.env === 'development';

    switch (mailer) {
      case 'smtp':
        options = {
          ...config.mailers[mailer],
          pool: true,
          debug: isDev,
          logger: isDev,
        };
        break;
      case 'log':
      default:
        options = { streamTransport: true };
        break;
    }

    this.transporter = nodemailer.createTransport(options);
  }

  close() {
    this.transporter.close();
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      const { from } = config;
      const defaults: SendMailOptions = { from };

      const info = await this.transporter.sendMail({ ...defaults, ...options });

      logger.info(info.messageId);

      if (this.mailer === 'log')
        info.message.pipe(process.stdout);
    }
    catch (err: any) {
      const { message, name, stack } = err;
      logger.error(stack ?? `${name}: ${message}`);
    }
  }
}

export default new Mailer();
