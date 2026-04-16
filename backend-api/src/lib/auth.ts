import { headers } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import pool, { queryOne } from './db'

const SECRET = process.env.JWT_SECRET || 'Rahasia_Negara_Sigap_2025_!@#'

// Fungsi untuk mengecek Token dan mengambil data User
export async function getSession(customToken?: string | null) {
  try {
    const headersList = await headers()
    const token = (customToken) || (headersList.get('authorization')?.split(' ')[1])

    if (!token) return null
    
    // Verifikasi Token
    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    } catch (jwtErr: any) {
      console.warn(`[AUTH] Token Invalid/Expired: ${jwtErr.message}`);
      return null;
    }

    if (decoded.userId && decoded.sessionId) {
      const user = await queryOne(`
        SELECT u.*, c.name as dept_name, c.name_en as dept_name_en 
        FROM User u
        LEFT JOIN Category c ON u.departmentId = c.id
        WHERE u.id = ?
      `, [Number(decoded.userId)]);
      
      if (!user) {
        console.warn(`[AUTH] User ID ${decoded.userId} tidak ditemukan di database.`);
        return null;
      }

      // Re-format object agar sesuai dengan ekspektasi aplikasi (nesting department)
      const formattedUser = {
        ...user,
        department: user.departmentId ? {
          id: user.departmentId,
          name: user.dept_name,
          name_en: user.dept_name_en
        } : null
      };

      // Jika seeder baru dijalankan dan user.sessionId kosong, update saja (self-healing)
      if (!user.sessionId) {
        await pool.execute('UPDATE User SET sessionId = ? WHERE id = ?', [decoded.sessionId, user.id]);
      }

      // Jika session ID tidak valid (login di browser/device lain), tolak.
      if (user.sessionId && user.sessionId !== decoded.sessionId) {
        console.warn(`[AUTH] Sesi Ganda Terdeteksi! ID di Token (${decoded.sessionId}) != ID di DB (${user.sessionId}) untuk User: ${user.username}`);
        return null
      }

      // Kembalikan objek gabungan yang kuat
      return {
        ...decoded,
        userId: user.id, // Pastikan userId selalu ada di top level
        user: formattedUser      // Sertakan objek user lengkap yang sudah di-format
      }
    }

    console.warn("[AUTH] Payload Token tidak lengkap (UserId/SessionId missing).");
    return null;
  } catch (error: any) {
    console.error("[AUTH_CRITICAL] Kesalahan sistem di getSession:", error.message);
    return null
  }
}