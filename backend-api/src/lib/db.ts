import mysql from 'mysql2/promise';

/**
 * 🛡️ STABLE DATABASE CONNECTION POOL
 * Dioptimalkan untuk MariaDB 10.6 di lingkungan cPanel/Jagoan Hosting.
 * Menambahkan KeepAlive untuk mencegah "Connection Lost" saat server idle.
 * Database Connection Pool - SIGAP Stable Version 1.0.1 (MySQL Native)
 */
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 detik
});

export default pool;

/**
 * Helper untuk menjalankan query dan mengembalikan semua hasil (Array)
 */
export async function query(sql: string, params: any[] = []): Promise<any> {
  const start = Date.now();
  try {
    const [results] = await pool.execute(sql, params);
    const duration = Date.now() - start;
    console.log(`[DB_QUERY] ${sql} (${duration}ms)`);
    return results;
  } catch (error: any) {
    console.error(`[DB_ERROR] ${sql} | Error: ${error.message}`);
    throw error;
  }
}

/**
 * Helper untuk menjalankan query dan mengembalikan hasil pertama (Single Object)
 */
export async function queryOne(sql: string, params: any[] = []) {
  const start = Date.now();
  try {
    const [results] = await pool.execute(sql, params);
    const duration = Date.now() - start;
    const rows = results as any[];
    console.log(`[DB_QUERY_ONE] ${sql} (${duration}ms)`);
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error(`[DB_ERROR_ONE] ${sql} | Error: ${error.message}`);
    throw error;
  }
}
