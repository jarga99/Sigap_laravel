import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { OAuth2Client } from 'google-auth-library'
import * as jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Disarankan untuk menyimpan CLIENT_ID Anda di .env
// Gunakan Client ID dari .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const client = new OAuth2Client(GOOGLE_CLIENT_ID)

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

export async function POST(request: Request) {
  try {
    const { credential } = await request.json()
    if (!credential) {
      return NextResponse.json({ message: 'Token Google tidak ditemukan' }, { status: 400 })
    }

    // 1. Verifikasi Token Google
    // Google Auth Library memverifikasi token yang dikirim dari klien React/Vue
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
    const user = await prisma.user.findUnique({
      where: { email: googleEmail },
      include: { department: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Akses Ditolak. Email ini belum didaftarkan oleh Administrator untuk mengakses sistem.' },
        { status: 403 }
      )
    }

    // 3. Generate Session Token (JWT Internal Sigap)
    const sessionId = crypto.randomUUID()

    await prisma.user.update({
      where: { id: user.id },
      data: { sessionId: sessionId }
    })

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
      sessionId: sessionId
    }

    // Token expires dalam 8 Jam
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' })

    // 5. Catat Log Aktivitas Login Google
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        resource: 'User',
        resourceId: user.id.toString(),
        details: JSON.stringify({ email: user.email, method: 'GOOGLE' }),
        userId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
      }
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
        department: user.department 
          ? { id: user.department.id, name: user.department.name }
          : null
      }
    })

  } catch (error: any) {
    console.error('Google Auth Error:', error)
    return NextResponse.json({ message: 'Gagal memverifikasi akun Google', error: error.message }, { status: 500 })
  }
}
