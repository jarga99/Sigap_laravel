import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;

/**
 * Helper to execute a query and return results
 */
export async function query(sql: string, params: any[] = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Helper to execute a query and return the first result
 */
export async function queryOne(sql: string, params: any[] = []) {
  const [results] = await pool.execute(sql, params);
  const rows = results as any[];
  return rows.length > 0 ? rows[0] : null;
}
