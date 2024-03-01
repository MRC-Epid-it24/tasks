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
import type { AxiosError } from 'axios';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { format, startOfDay, subDays } from 'date-fns';
import https from 'https';

import type { Config } from '@/config';
import type { ExportSurveyTaskParams } from '@/tasks/export-survey-data';
import { logger } from '@/services';
import { sleep } from '@/util';

import storage from '../storage';

export type JobEntry = {
  completedAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
  downloadUrlExpiresAt: string | null;
  id: string;
  message: string | null;
  params: {
    surveyId: string;
    startDate: string;
    endDate: string;
  };
  progress: number | null;
  stackTrace: string | null;
  startedAt: string | null;
  successful: boolean | null;
  type: string;
  updatedAt: string;
  userId: string;
};

export type ExportSurveyDataParams = {
  startDate: string;
  endDate: string;
};

export type SurveyEntry = {
  id: string;
  startDate: string;
  endDate: string;
};

export type SubscribeCallback = (err?: AxiosError) => void;

const it24v4 = (config: Config) => {
  let isRefreshing = false;
  let tokenSubscribers: SubscribeCallback[] = [];

  const subscribeTokenRefresh = (cb: SubscribeCallback) => tokenSubscribers.push(cb);

  const onTokenRefreshed = (errRefreshing?: AxiosError) =>
    tokenSubscribers.map((cb) => cb(errRefreshing));

  let accessToken = config.api.v4.token;
  let refreshToken = '';

  const client = axios.create({
    baseURL: `${config.api.v4.url}/api/admin`,
    headers: { common: { 'X-Requested-With': 'XMLHttpRequest' } },
    withCredentials: true,
    httpsAgent:
      config.app.env === 'development' ? new https.Agent({ rejectUnauthorized: false }) : undefined,
  });
  axiosRetry(client, { retries: 5, retryDelay: (retryCount) => retryCount * 400 });

  client.interceptors.request.use((request) => {
    if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;

    return request;
  });

  client.interceptors.response.use(
    (response) => response,
    async (err: AxiosError) => {
      const { config, response: { status } = {} } = err;

      // Exclude non-401s and sign-in 401s (/login)
      if (!config?.url || status !== 401 || config.url?.match(/auth\/login$/))
        return Promise.reject(err);

      const isRefreshRequest = config.url?.includes('auth/refresh');

      if (!isRefreshing || isRefreshRequest) {
        isRefreshing = true;

        (isRefreshRequest ? login : refresh)()
          .then(() => {
            isRefreshing = false;
            onTokenRefreshed();
            tokenSubscribers = [];
          })
          .catch(() => {
            isRefreshing = false;
            onTokenRefreshed(err);
            tokenSubscribers = [];
          });
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((errRefreshing) => {
          if (errRefreshing) return reject(errRefreshing);

          return resolve(isRefreshRequest ? undefined : client(config));
        });
      });
    }
  );

  const saveTokens = (token: string, cookie: any) => {
    accessToken = token.replace('Bearer ', '');

    if (Array.isArray(cookie)) {
      cookie.forEach((item) => {
        if (typeof item !== 'string') return;

        const match = item.match(/^it24a_refresh_token=(?<token>[^;]*);/);
        const { token } = match?.groups || {};
        if (token) refreshToken = token;
      });
    }
  };

  const login = async () => {
    const res = await client.post<{ accessToken: string }>('auth/login', {
      email: config.api.v4.username,
      password: config.api.v4.password,
    });

    saveTokens(res.data.accessToken, res.headers['set-cookie']);
  };

  const refresh = async () => {
    const res = await client.post<{ accessToken: string }>(
      'auth/refresh',
      {},
      { headers: { cookie: `it24a_refresh_token=${refreshToken}` } }
    );

    saveTokens(res.data.accessToken, res.headers['set-cookie']);
  };

  const getJob = async (jobId: string): Promise<JobEntry> => {
    const { data } = await client.get<JobEntry>(`user/jobs/${jobId}`);
    return data;
  };

  const getSurvey = async (surveyId: string): Promise<SurveyEntry> => {
    const { data } = await client.get<SurveyEntry>(`surveys/${surveyId}`);
    return data;
  };

  const requestDataExport = async (
    surveyId: string,
    params: ExportSurveyDataParams
  ): Promise<JobEntry> => {
    const { data } = await client.post<JobEntry>(`surveys/${surveyId}/tasks`, {
      type: 'SurveyDataExport',
      params,
    });
    return data;
  };

  const downloadExportFile = async (jobId: string): Promise<string> => {
    const res = await client.get(`user/jobs/${jobId}/download`, { responseType: 'blob' });

    const match = res.headers['content-disposition'].match(/^.*filename=(?<name>.*)$/);
    const { name } = match?.groups || {};

    const filename =
      name && typeof name === 'string'
        ? name
        : `intake24-export-${jobId}_${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;

    return storage.save(filename, res.data);
  };

  const prepareDataExportPayload = (
    params: ExportSurveyTaskParams,
    surveyEntry: SurveyEntry
  ): ExportSurveyDataParams => {
    const { exportOffset } = params;
    const startDate = new Date(surveyEntry.startDate);
    const endDate = new Date(surveyEntry.endDate);

    let dateFrom: Date;

    if (exportOffset) {
      dateFrom = subDays(startOfDay(new Date()), exportOffset);
      if (dateFrom > endDate) dateFrom = endDate;
    } else {
      dateFrom = startDate;
    }

    return { startDate: format(dateFrom, 'yyyy-MM-dd'), endDate: surveyEntry.endDate };
  };

  const fetchDataExportFile = async (params: ExportSurveyTaskParams): Promise<string> => {
    const { survey: surveyId } = params;

    if (!accessToken) await login();

    const survey = await getSurvey(surveyId);
    const exportParams = prepareDataExportPayload(params, survey);

    let job = await requestDataExport(surveyId, exportParams);

    let inProgress = true;

    while (inProgress) {
      job = await getJob(job.id);

      const { startedAt, completedAt, message, progress, stackTrace, successful } = job;

      if ([startedAt, progress].some((value) => value === null)) {
        logger.info(`IT24v4: Job ${job.id} pending.`);
      } else if ([completedAt, message, stackTrace, successful].some((value) => value !== null)) {
        inProgress = false;
        logger.info(`IT24v4: Job ${job.id} done.`);
      } else if (progress !== null) {
        logger.info(`IT24v4: Job ${job.id} in progress (${Math.ceil(progress * 100)}%).`);
      } else {
        inProgress = false;
        console.log(job);
        logger.warn(`IT24v4: Job ${job.id} done with unknown outcome.`);
      }

      if (inProgress) await sleep(2000);
    }

    if (!job.successful) throw new Error(`IT24v4: Job ${job.id} failed: ${job.message}`);

    return downloadExportFile(job.id);
  };

  return {
    fetchDataExportFile,
  };
};

export default it24v4;

export type IT24v4 = ReturnType<typeof it24v4>;
