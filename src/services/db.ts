import { Pool } from 'pg';
import dbConfig from '../config/db';

export const pg = new Pool({ connectionString: dbConfig.it24.connectionString });

export default { pg };
