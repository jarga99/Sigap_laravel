import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs' // Pastikan pakai bcryptjs, bukan bcrypt (lebih aman di Next.js)
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'
import crypto from 'crypto'
import { isAuthorized, reportUnauthorized } from '@/lib/security'
import { headers } from 'next/headers'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'Rahasia_Negara_Sigap_2025_!@#'

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues?.[0]?.message || 'Data tidak valid' }, { status: 400 })
    }

    const { username, password } = validation.data

    // 🛡️ SILENT PHONE HOME (Deteksi Oknum)
    const host = (await headers()).get('host') || ''
    if (!isAuthorized(host)) {
      // Tidak memblokir login (agar oknum tidak curiga), tapi lapor ke developer
      await reportUnauthorized(host, `LOGIN_ATTEMPT: ${username}`)
    }

    // 1. Cari User berdasarkan USERNAME saja (Hapus logika email)
    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            name_en: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 401 })
    }

    // 2. Cek Password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // 3. Buat Session ID unik (Concurrent Login Protection)
    const sessionId = crypto.randomUUID()
    
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionId: sessionId }
    })

    // 4. Buat Token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        departmentId: user.departmentId,
        sessionId: sessionId // <--- Sesi eksklusif saat ini
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    // 5. Catat Log Aktivitas Login
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        resource: 'User',
        resourceId: user.id.toString(),
        details: JSON.stringify({ username: user.username, method: 'PASSWORD' }),
        userId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
      }
    })

    return NextResponse.json({
      message: 'Login berhasil',
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        fullName: user.fullName,
        email: user.email, 
        image_url: user.image_url,
        department: user.department 
      },
      token
    })

  } catch (error) {
    console.error("Login Error:", error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}