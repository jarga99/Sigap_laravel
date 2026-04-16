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
export async function query(sql: string, params: any[] = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Helper untuk menjalankan query dan mengembalikan hasil pertama (Single Object)
 */
export async function queryOne(sql: string, params: any[] = []) {
  const [results] = await pool.execute(sql, params);
  const rows = results as any[];
  return rows.length > 0 ? rows[0] : null;
}
