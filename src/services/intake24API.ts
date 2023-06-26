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
import { format } from 'date-fns';

import config from '@/config';

import storage from './storage';

const { it24 } = config.api;
axios.defaults.baseURL = it24.url;

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

export default {
  accessToken: '',
  refreshToken: '',

  /**
   * Sign-in to Intake24 instance
   *
   * @returns {Promise<void>}
   */
  async getRefreshToken(): Promise<void> {
    try {
      const {
        data: { refreshToken },
      } = await axios.post('signin', { email: it24.username, password: it24.password });

      this.refreshToken = refreshToken;
    } catch (err: any) {
      throw new Error(`IT24 API getRefreshToken failed with: ${err.message}`);
    }
  },

  /**
   * Obtain fresh access token
   *
   * @returns {Promise<void>}
   */
  async getAccessToken(): Promise<void> {
    try {
      const {
        data: { accessToken },
      } = await axios.post('refresh', {}, { headers: { 'X-Auth-Token': this.refreshToken } });

      this.accessToken = accessToken;
    } catch (err: any) {
      throw new Error(`IT24 API getAccessToken failed with: ${err.message}`);
    }
  },

  /**
   * Log in to Intake24 and get fresh refresh & access tokens
   *
   * @returns {Promise<void>}
   */
  async login(): Promise<void> {
    await this.getRefreshToken();
    await this.getAccessToken();
  },

  /**
   * Get survey information
   *
   * @param {string} surveyId
   * @returns {Promise<SurveyInfo>}
   */
  async getSurvey(surveyId: string): Promise<SurveyInfo> {
    try {
      const { data } = await axios.get(`surveys/${surveyId}`, {
        headers: { 'X-Auth-Token': this.accessToken },
      });
      return data;
    } catch (err: any) {
      throw new Error(`IT24 API getSurvey failed with: ${err.message}`);
    }
  },

  /**
   * Synchronously export survey data
   *
   * @param {string} surveyId
   * @param {ExportSurveyDataParams} params
   * @returns {Promise<string>}
   */
  async exportSurveyData(surveyId: string, params: ExportSurveyDataParams): Promise<string> {
    try {
      const { data } = await axios.get(`data-export/${surveyId}/submissions/csv`, {
        params,
        headers: { 'X-Auth-Token': this.accessToken },
      });

      const filename = `Intake24-export-${surveyId}_${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;

      const file = storage.save(filename, data);
      return file;
    } catch (err: any) {
      throw new Error(`IT24 API exportSurveyData failed with: ${err.message}`);
    }
  },

  /**
   * Asynchronously export/trigger survey data
   *
   * @param {string} surveyId
   * @param {ExportSurveyDataParams} params
   * @returns {Promise<number>}
   */
  async asyncExportSurveyData(surveyId: string, params: ExportSurveyDataParams): Promise<number> {
    try {
      const {
        data: { taskId },
      } = await axios.post(
        `data-export/${surveyId}/submissions/async/csv`,
        {},
        { params, headers: { 'X-Auth-Token': this.accessToken } }
      );

      return taskId;
    } catch (err: any) {
      throw new Error(`IT24 API asyncExportSurveyData failed with: ${err.message}`);
    }
  },

  /**
   * Query active / running tasks
   *
   * @param {string} surveyId
   * @returns {Promise<object[]>}
   */
  async getActiveTasks(surveyId: string): Promise<ActiveTask[]> {
    const {
      data: { activeTasks },
    } = await axios.get(`data-export/${surveyId}/submissions/async/status`, {
      headers: { 'X-Auth-Token': this.accessToken },
    });
    return activeTasks;
  },

  /**
   * Download prepared data-export file
   *
   * @param {string} surveyId
   * @param {string} url
   * @returns {Promise<string>}
   */
  async getExportFile(surveyId: string, url: string): Promise<string> {
    try {
      const res = await axios.get(url, { headers: { 'X-Auth-Token': this.accessToken } });

      const filename = `Intake24-export-${surveyId}_${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;

      const file = storage.save(filename, res.data);
      return file;
    } catch (err: any) {
      throw new Error(`IT24 API getExportFile failed with: ${err.message}`);
    }
  },

  /* async uploadSurveyRespondents(surveyName: string, file: string) {
    try {
      const surveyInfo = await this.getSurvey(surveyName);
      const formData = new FormData();
      formData.append('file', fs.createReadStream(path.resolve(file)));
      await axios.post(
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
};
