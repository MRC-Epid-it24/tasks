import api from '../services/apiService';
import store from '../services/storageService';

export default {
  EXPORT_SURVEY_DATA: async surveyName => {
    try {
      await api.login();
      const file = await api.dataExport(surveyName);
      await store.processFile(file);
      console.log(`Task EXPORT_SURVEY_DATA processed.`);
    } catch (err) {
      console.error(`Task EXPORT_SURVEY_DATA failed: ${err}`);
    }
  }
};
