import axios from 'axios';
import fecha from 'fecha';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import config from '../config';
import tmp from './tmpService';

const { it24 } = config.api;

export default {
  accessToken: '',
  refreshToken: '',

  async getRefreshToken() {
    try {
      const res = await axios.post(`${it24.url}/signin`, {
        email: it24.username,
        password: it24.password
      });
      this.refreshToken = res.data.refreshToken;
      return this.refreshToken;
    } catch (err) {
      throw new Error(`getRefreshToken failed with: ${err.message}'`);
    }
  },

  async getAccessToken() {
    try {
      const res = await axios.post(
        `${it24.url}/refresh`,
        {},
        {
          headers: {
            'X-Auth-Token': this.refreshToken
          }
        }
      );
      this.accessToken = res.data.accessToken;
      return this.accessToken;
    } catch (err) {
      throw new Error(`getAccessToken failed with: ${err.message}'`);
    }
  },

  async login() {
    await this.getRefreshToken();
    await this.getAccessToken();
  },

  async getSurvey(surveyId) {
    try {
      const res = await axios.get(`${it24.url}/surveys/${surveyId}`, {
        headers: {
          'X-Auth-Token': this.accessToken
        }
      });
      return res.data;
    } catch (err) {
      throw new Error(`getSurvey failed with: ${err.message}'`);
    }
  },

  async exportSurveyData(surveyName, format = 'v2') {
    try {
      const surveyInfo = await this.getSurvey(surveyName);
      const res = await axios.get(`${it24.url}/data-export/${surveyInfo.id}/submissions/csv`, {
        params: {
          dateFrom: surveyInfo.startDate,
          dateTo: surveyInfo.endDate,
          forceBOM: '1',
          format
        },
        headers: {
          'X-Auth-Token': this.accessToken
        }
      });

      const filename = `Intake24-export-${surveyInfo.id}_${fecha.format(
        new Date(),
        'YYYY-MM-DD-hh-mm-ss'
      )}.csv`;

      const file = tmp.save(filename, res.data);
      return file;
    } catch (err) {
      throw new Error(`exportSurveyData failed with: ${err.message}'`);
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
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
          }
        }
      );
    } catch (err) {
      throw new Error(`uploadSurveyRespondents failed with: ${err.message}'`);
    }
  }
};
