import axios from 'axios';
import fecha from 'fecha';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import config from '../config';
import storage from './storage';

const { it24 } = config.api;
axios.defaults.baseURL = it24.url;

export default {
  accessToken: null,
  refreshToken: null,

  /**
   * Sign-in to Intake24 instance
   *
   * @return String
   */
  async getRefreshToken() {
    try {
      const res = await axios.post('signin', { email: it24.username, password: it24.password });
      this.refreshToken = res.data.refreshToken;
      return this.refreshToken;
    } catch (err) {
      throw new Error(`IT24 API getRefreshToken failed with: ${err.message}`);
    }
  },

  /**
   * Obtain fresh access token
   *
   * @return String
   */
  async getAccessToken() {
    try {
      const res = await axios.post(
        'refresh',
        {},
        {
          headers: {
            'X-Auth-Token': this.refreshToken,
          },
        }
      );
      this.accessToken = res.data.accessToken;
      return this.accessToken;
    } catch (err) {
      throw new Error(`IT24 API getAccessToken failed with: ${err.message}`);
    }
  },

  /**
   * Log in to Intake24 and get fresh refresh & access tokens
   *
   * @return void
   */
  async login() {
    await this.getRefreshToken();
    await this.getAccessToken();
  },

  /**
   * Get survey information
   *
   * @param String surveyId
   * @return void
   */
  async getSurvey(surveyId) {
    try {
      const { data } = await axios.get(`surveys/${surveyId}`, {
        headers: {
          'X-Auth-Token': this.accessToken,
        },
      });
      return data;
    } catch (err) {
      throw new Error(`IT24 API getSurvey failed with: ${err.message}`);
    }
  },

  /**
   * Synchronously export survey data
   *
   * @param String surveyId
   * @param Object params
   * @return String
   */
  async exportSurveyData(surveyId, params) {
    try {
      const res = await axios.get(`data-export/${surveyId}/submissions/csv`, {
        params,
        headers: {
          'X-Auth-Token': this.accessToken,
        },
      });

      const filename = `Intake24-export-${surveyId}_${fecha.format(
        new Date(),
        'YYYY-MM-DD-hh-mm-ss'
      )}.csv`;

      const file = storage.save(filename, res.data);
      return file;
    } catch (err) {
      throw new Error(`IT24 API exportSurveyData failed with: ${err.message}`);
    }
  },

  /**
   * Asynchronously export/trigger survey data
   *
   * @param String surveyId
   * @param Object params
   * @return Int
   */
  async asyncExportSurveyData(surveyId, params) {
    try {
      const res = await axios.post(
        `data-export/${surveyId}/submissions/async/csv`,
        {},
        {
          params,
          headers: {
            'X-Auth-Token': this.accessToken,
          },
        }
      );

      return res.data.taskId;
    } catch (err) {
      throw new Error(`IT24 API asyncExportSurveyData failed with: ${err.message}`);
    }
  },

  /**
   * Query active / running tasks
   *
   * @param String surveyId
   * @return Array
   */
  async getActiveTasks(surveyId) {
    try {
      const res = await axios.get(`data-export/${surveyId}/submissions/async/status`, {
        headers: {
          'X-Auth-Token': this.accessToken,
        },
      });

      return res.data.activeTasks;
    } catch (err) {
      throw new Error(`IT24 API getActiveTasks failed with: ${err.message}`);
    }
  },

  /**
   * Download prepared data-export file
   *
   * @param String surveyId
   * @param String url
   * @return String
   */
  async getExportFile(surveyId, url) {
    try {
      const res = await axios.get(url, {
        headers: {
          'X-Auth-Token': this.accessToken,
        },
      });

      const filename = `Intake24-export-${surveyId}_${fecha.format(
        new Date(),
        'YYYY-MM-DD-hh-mm-ss'
      )}.csv`;

      const file = storage.save(filename, res.data);
      return file;
    } catch (err) {
      throw new Error(`IT24 API getActiveTasks failed with: ${err.message}`);
    }
  },

  async uploadSurveyRespondents(surveyName, file) {
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
  },
};
