import fs from 'fs';
import path from 'path';
import config from '../config/filesystem';

class Storage {
  constructor() {
    this.cwd = config.tmp.dir;
    this.dir = this.tap();
  }

  /**
   * Verify that temporary directory exists
   *
   * @return String
   */
  tap(...segments) {
    const dir = path.resolve(this.cwd, ...segments);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return dir;
  }

  /**
   * Save data to file at temporary location
   *
   * @param String filename
   * @param String data
   *
   * @return String
   */
  save(filename, data) {
    const file = path.resolve(this.cwd, filename);
    fs.appendFileSync(file, data);

    return file;
  }
}

export default new Storage();
