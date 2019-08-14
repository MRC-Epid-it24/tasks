import api from '../services/apiService';
import store from '../services/storageService';

export default {
  YR12_DATA_EXPORT: async surveyName => {
    try {
      await api.login();
      const file = await api.dataExport(surveyName);
      await store.processFile(file);
      console.log(`Export processed.`);
    } catch (err) {
      console.error(`Export failed: ${err}`);
    }
  }
};
