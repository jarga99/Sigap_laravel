import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { OAuth2Client } from 'google-auth-library'
import * as jwt from 'jsonwebtoken'
import { recordAuditLog } from '@/lib/logger'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const client = new OAuth2Client(GOOGLE_CLIENT_ID)

const JWT_SECRET = process.env.JWT_SECRET || 'Rahasia_Negara_Sigap_2025_!@#'

export async function POST(request: Request) {
  try {
    const { credential } = await request.json()
    if (!credential) {
      return NextResponse.json({ message: 'Token Google tidak ditemukan' }, { status: 400 })
    }

    // 1. Verifikasi Token Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return NextResponse.json({ message: 'Payload Google tidak valid.' }, { status: 400 })
    }

    const googleEmail = payload.email

    // 2. Cek apakah email terdaftar di database kita (Didaftarkan oleh Super Admin)
    // Gunakan JOIN untuk mengambil data department sekalian
    const user = await queryOne(`
      SELECT u.*, d.name as dept_name 
      FROM User u 
      LEFT JOIN Department d ON u.departmentId = d.id 
      WHERE u.email = ?
    `, [googleEmail])

    if (!user) {
      return NextResponse.json(
        { message: 'Akses Ditolak. Email ini belum didaftarkan oleh Administrator untuk mengakses sistem.' },
        { status: 403 }
      )
    }

    // 3. Generate Session Token (JWT Internal Sigap)
    const sessionId = crypto.randomUUID()

    // Update session secara atomic via MySQL
    await pool.execute(
      'UPDATE User SET sessionId = ? WHERE id = ?',
      [sessionId, user.id]
    )

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
      sessionId: sessionId
    }

    // Token expires dalam 8 Jam
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' })

    // 5. Catat Log Aktivitas Login Google via Logger terpusat
    recordAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, method: 'GOOGLE' },
      departmentId: user.departmentId,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    // 6. Return Data Login
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image_url: user.image_url,
        department: user.departmentId 
          ? { id: user.departmentId, name: user.dept_name }
          : null
      }
    })

  } catch (error: any) {
    console.error('Google Auth Error:', error)
    return NextResponse.json({ message: 'Gagal memverifikasi akun Google', error: error.message }, { status: 500 })
  }
}
