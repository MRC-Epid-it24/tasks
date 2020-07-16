import sql from 'mssql';
import { Pool } from 'pg';
import dbConfig from '../config/db';

export const mssql = new sql.ConnectionPool(dbConfig.epid);

export const pg = new Pool({ connectionString: dbConfig.it24.connectionString });

export default { mssql, pg };
