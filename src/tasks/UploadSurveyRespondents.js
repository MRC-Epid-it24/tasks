import api from '../services/apiService';

export default class {
  constructor(surveyName) {
    this.surveyName = surveyName;
    this.data = [];
    this.filename = '';
  }

  static async run() {
    try {
      await api.login();
      // TODO get and process file
      // await api.uploadSurveyRespondents(this.surveyName, 'file.csv');
      console.log(`Task UPLOAD_SURVEY_RESPONDENTS processed.`);
    } catch (err) {
      console.error(`Task UPLOAD_SURVEY_RESPONDENTS failed: ${err}`);
    }
  }
}
