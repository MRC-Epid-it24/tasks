import axios from 'axios';
import fecha from 'fecha';
import fs from 'fs';
import path from 'path';
import config from '../config';

const { auth } = config;

export default {
  accessToken: '',
  refreshToken: '',

  async getRefreshToken() {
    try {
      const res = await axios.post(`${config.url}/signin`, {
        email: auth.username,
        password: auth.password
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
        `${config.url}/refresh`,
        {},
        {
          headers: {
            'X-Auth-Token': this.refreshToken
          }
        }
      );
      this.accessToken = res.data.accessToken;
      return res.data.accessToken;
    } catch (err) {
      throw new Error(`getAccessToken failed with: ${err.message}'`);
    }
  },

  async login() {
    await this.getRefreshToken();
    await this.getAccessToken();
  },

  async getSurveyInfo(surveyId) {
    try {
      const res = await axios.get(`${config.url}/surveys/${surveyId}`, {
        headers: {
          'X-Auth-Token': this.accessToken
        }
      });
      return res.data;
    } catch (err) {
      throw new Error(`getSurveyInfo failed with: ${err.message}'`);
    }
  },

  async dataExport(surveyName, format = 'v1') {
    try {
      const surveyInfo = await this.getSurveyInfo(surveyName);
      const res = await axios.get(`${config.url}/data-export/${surveyInfo.id}/submissions/csv`, {
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

      const file = `Intake24-export-${surveyInfo.id}_${fecha.format(
        new Date(),
        'YYYY-MM-DD-hh-mm-ss'
      )}.csv`;

      const dir = path.resolve('tmp');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      const filepath = path.resolve('tmp', file);
      fs.appendFileSync(filepath, res.data);
      return filepath;
    } catch (err) {
      throw new Error(`dataExport failed with: ${err.message}'`);
    }
  },

  async usersUpload(surveyName) {
    try {
      const surveyInfo = await this.getSurveyInfo(surveyName);
    } catch (err) {
      throw new Error(`userUpload failed with: ${err.message}'`);
    }
  }
};
