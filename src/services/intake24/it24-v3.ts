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

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { format } from 'date-fns';

import type { Config } from '@/config/index.js';
import type { ExportSurveyTaskParams } from '@/tasks/export-survey-data.js';
import { logger } from '@/services/index.js';
import { sleep } from '@/util/index.js';

import storage from '../storage.js';

export type ExportSurveyDataParams = {
  dateFrom: Date;
  dateTo: Date;
  forceBOM: string;
  format: string;
};

export type SurveyInfo = {
  id: string;
  startDate: Date;
  endDate: Date;
};

export type ActiveTaskStatus = { [status: string]: Record<string, unknown> };

export type ActiveTask = {
  id: number;
  createdAt: Date;
  dateFrom: Date;
  dateTo: Date;
  status: ActiveTaskStatus;
};

function it24v3(config: Config) {
  let accessToken = '';
  let refreshToken = '';

  const client = axios.create({ baseURL: config.api.v3.url });
  axiosRetry(client, { retries: 5, retryDelay: retryCount => retryCount * 400 });

  /**
   * Sign-in to Intake24 instance
   *
   * @returns {Promise<void>}
   */
  const getRefreshToken = async () => {
    try {
      const { data } = await client.post('signin', {
        email: config.api.v3.username,
        password: config.api.v3.password,
      });

      refreshToken = data.refreshToken;
    }
    catch (err: any) {
      throw new Error(`IT24v3: getRefreshToken failed with: ${err.message}`);
    }
  };

  /**
   * Obtain fresh access token
   *
   * @returns {Promise<void>}
   */
  const getAccessToken = async () => {
    try {
      const { data } = await client.post(
        'refresh',
        {},
        { headers: { 'X-Auth-Token': refreshToken } },
      );

      accessToken = data.accessToken;
    }
    catch (err: any) {
      throw new Error(`IT24v3: getAccessToken failed with: ${err.message}`);
    }
  };

  /**
   * Log in to Intake24 and get fresh refresh & access tokens
   *
   * @returns {Promise<void>}
   */
  const login = async () => {
    await getRefreshToken();
    await getAccessToken();
  };

  /**
   * Get survey information
   *
   * @param {string} surveyId
   * @returns {Promise<SurveyInfo>}
   */
  const getSurvey = async (surveyId: string) => {
    try {
      const { data } = await client.get(`surveys/${surveyId}`, {
        headers: { 'X-Auth-Token': accessToken },
      });
      return data;
    }
    catch (err: any) {
      throw new Error(`IT24v3: getSurvey failed with: ${err.message}`);
    }
  };

  /**
   * Synchronously export survey data
   *
   * @param {string} surveyId
   * @param {ExportSurveyDataParams} params
   * @returns {Promise<string>}
   */
  /* const exportSurveyData = async (
    surveyId: string,
    params: ExportSurveyDataParams,
  ): Promise<string> => {
    try {
      const { data } = await client.get(`data-export/${surveyId}/submissions/csv`, {
        params,
        headers: { 'X-Auth-Token': accessToken },
      });

      const filename = `Intake24-export-${surveyId}_${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;

      const file = storage.save(filename, data);
      return file;
    } catch (err: any) {
      throw new Error(`IT24 API exportSurveyData failed with: ${err.message}`);
    }
  }; */

  /**
   * Asynchronously export/trigger survey data
   *
   * @param {string} surveyId
   * @param {ExportSurveyDataParams} params
   * @returns {Promise<number>}
   */
  const asyncExportSurveyData = async (
    surveyId: string,
    params: ExportSurveyDataParams,
  ): Promise<number> => {
    try {
      const {
        data: { taskId },
      } = await client.post(
        `data-export/${surveyId}/submissions/async/csv`,
        {},
        { params, headers: { 'X-Auth-Token': accessToken } },
      );

      return taskId;
    }
    catch (err: any) {
      throw new Error(`IT24v3: asyncExportSurveyData failed with: ${err.message}`);
    }
  };

  /**
   * Query active / running tasks
   *
   * @param {string} surveyId
   * @returns {Promise<object[]>}
   */
  const getActiveTasks = async (surveyId: string): Promise<ActiveTask[]> => {
    const {
      data: { activeTasks },
    } = await client.get(`data-export/${surveyId}/submissions/async/status`, {
      headers: { 'X-Auth-Token': accessToken },
    });
    return activeTasks;
  };

  /**
   * Download prepared data-export file
   *
   * @param {string} surveyId
   * @param {string} url
   * @returns {Promise<string>}
   */
  const getExportFile = async (surveyId: string, url: string): Promise<string> => {
    try {
      const res = await client.get(url, { headers: { 'X-Auth-Token': accessToken } });

      const filename = `Intake24-export-${surveyId}_${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;

      const file = storage.save(filename, res.data);
      return file;
    }
    catch (err: any) {
      throw new Error(`IT24v3: getExportFile failed with: ${err.message}`);
    }
  };

  const getExportDataParams = (
    params: ExportSurveyTaskParams,
    surveyInfo: SurveyInfo,
  ): ExportSurveyDataParams => {
    const { exportOffset, exportVersion } = params;
    const { startDate, endDate: dateTo } = surveyInfo;

    let dateFrom: Date;

    if (exportOffset) {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - exportOffset);
      dateFrom.setHours(0, 0, 0, 0);

      if (dateFrom > dateTo)
        dateFrom = dateTo;
    }
    else {
      dateFrom = startDate;
    }

    return { dateFrom, dateTo, forceBOM: '1', format: exportVersion ?? 'v2' };
  };

  const fetchDataExportFile = async (params: ExportSurveyTaskParams): Promise<string> => {
    const { survey } = params;
    await login();
    const surveyInfo = await getSurvey(survey);
    const taskId = await asyncExportSurveyData(survey, getExportDataParams(params, surveyInfo));

    let inProgress = true;
    let failedAttempts = 0;
    let filename: string | undefined;

    while (inProgress) {
      let activeTasks;
      try {
        activeTasks = await getActiveTasks(survey);
      }
      catch (err: any) {
        // TEMP: intake24 very sporadically returns with 502 gateway error (nginx or outer proxy -> to investigate)
        if (axios.isAxiosError(err) && err.response?.status === 502 && failedAttempts < 10) {
          logger.warn(`IT24v3: getActiveTasks responded with 502: ${err.message}`);
          failedAttempts++;
          await sleep(2000);
          continue;
        }

        // If any other error, stop the polling
        inProgress = false;
        throw new Error(`IT24v3: getActiveTasks failed with: ${err.message}`);
      }

      const task = activeTasks.find(item => item.id === taskId);
      if (!task) {
        inProgress = false;
        throw new Error(`IT24v3: DataExport task not found.`);
      }

      const [status, value] = Object.entries(task.status)[0];
      switch (status) {
        case 'Pending':
          logger.info(`IT24v3: DataExport (Task ${taskId}) is pending.`);
          break;
        case 'InProgress':
          logger.info(
            `IT24v3: DataExport (Task ${taskId}) is in progress (${Math.ceil(
              (value.progress as number) * 100,
            )}%).`,
          );
          break;
        case 'DownloadUrlPending':
          logger.info(`IT24v3: DataExport (Task ${taskId}) is preparing URL for download.`);
          break;
        case 'DownloadUrlAvailable':
          inProgress = false;
          filename = await getExportFile(survey, value.url as string);
          logger.info(`IT24v3: DataExport from Intake24 is done.`);
          break;
        case 'Failed':
          inProgress = false;
          throw new Error(`IT24v3: DataExport (Task ${taskId}) has failed.`);
        default:
          inProgress = false;
          logger.warn(`IT24v3: DataExport (Task ${taskId}) with invalid status (${status}).`);
          break;
      }

      if (inProgress)
        await sleep(2000);
    }

    if (!filename)
      throw new Error(`Missing file: ${filename}`);

    return filename;
  };

  return {
    fetchDataExportFile,
  };

  /* async uploadSurveyRespondents(surveyName: string, file: string) {
    try {
      const surveyInfo = await this.getSurvey(surveyName);
      const formData = new FormData();
      formData.append('file', fs.createReadStream(path.resolve(file)));
      await client.post(
        `${it24.url}/surveys/${surveyInfo.id}/users/respondents/upload-csv`,
        formData,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            // eslint-disable-next-line no-underscore-dangle
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          },
        }
      );
    } catch (err) {
      throw new Error(`IT24 API uploadSurveyRespondents failed with: ${err.message}`);
    }
  }, */
}

export default it24v3;

export type IT24v3 = ReturnType<typeof it24v3>;
