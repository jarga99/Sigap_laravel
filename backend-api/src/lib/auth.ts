import { headers } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import { prisma } from './prisma'

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
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.userId) }, // Pastikan ID adalah Number
        include: {
          department: {
            select: { id: true, name: true, name_en: true }
          }
        }
      })
      
      if (!user) {
        console.warn(`[AUTH] User ID ${decoded.userId} tidak ditemukan di database.`);
        return null;
      }

      // Jika seeder baru dijalankan dan user.sessionId kosong, update saja (self-healing)
      if (!user.sessionId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionId: decoded.sessionId }
        });
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
        user: user      // Sertakan objek user lengkap
      }
    }

    console.warn("[AUTH] Payload Token tidak lengkap (UserId/SessionId missing).");
    return null;
  } catch (error: any) {
    console.error("[AUTH_CRITICAL] Kesalahan sistem di getSession:", error.message);
    return null
  }
}