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
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload

    if (decoded.userId && decoded.sessionId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })
      
      // Jika seeder baru dijalankan dan user.sessionId kosong, update saja (self-healing)
      if (user && !user.sessionId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionId: decoded.sessionId }
        });
      }

      // Jika session ID tidak valid (login di browser/device lain), tolak.
      if (!user || (user.sessionId && user.sessionId !== decoded.sessionId)) {
        return null
      }
    }

    return decoded // Berisi { userId, role, username, departmentId, sessionId }
  } catch {
    return null
  }
}