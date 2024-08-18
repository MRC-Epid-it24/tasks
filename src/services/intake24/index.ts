import { config } from '@/config/index.js';

import it24v3 from './it24-v3.js';
import it24v4 from './it24-v4.js';

export const api = {
  v3: it24v3(config),
  v4: it24v4(config),
};
