import fs from 'fs';
import path from 'path';

export default {
  /**
   * Verify that temporary directory exists
   *
   * @return void
   */
  checkDir() {
    const dir = path.resolve('tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  },

  /**
   * Save data to file at temporary location
   *
   * @param String filename
   * @param String data
   *
   * @return String
   */
  save(filename, data) {
    this.checkDir();

    const file = path.resolve('tmp', filename);
    fs.appendFileSync(file, data);

    return file;
  }
};
