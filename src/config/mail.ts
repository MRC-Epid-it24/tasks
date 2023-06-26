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

export type MailerType = 'smtp' | 'log';

export type BaseMailer = {
  transport: string;
};

export type LogMailer = BaseMailer;

export interface SMTPMailer extends BaseMailer {
  host: string;
  port: number;
  secure: boolean;
  ignoreTLS: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export type MailConfig = {
  mailer: MailerType;
  mailers: {
    smtp: SMTPMailer;
    log: LogMailer;
  };
  from: {
    address: string;
    name: string;
  };
};

const user = process.env.MAIL_USERNAME || null;
const pass = process.env.MAIL_PASSWORD || null;
const auth = user && pass ? { user, pass } : undefined;

const mailConfig: MailConfig = {
  mailer: (process.env.MAIL_MAILER as MailerType) || 'log',

  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT ?? '25', 10),
      secure: process.env.MAIL_SECURE === 'true',
      ignoreTLS: process.env.MAIL_IGNORE_TLS === 'true',
      auth,
    },
    log: {
      transport: 'log',
    },
  },

  from: {
    address: process.env.MAIL_FROM_ADDRESS || 'example@domain.com',
    name: process.env.MAIL_FROM_NAME || 'Intake24 Tasks',
  },
};

export default mailConfig;
