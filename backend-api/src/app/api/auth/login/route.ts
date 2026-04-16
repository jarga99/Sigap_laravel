import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import bcrypt from 'bcryptjs' // Pastikan pakai bcryptjs, bukan bcrypt (lebih aman di Next.js)
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'
import crypto from 'crypto'
import { isAuthorized, reportUnauthorized } from '@/lib/security'
import { headers } from 'next/headers'

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

    // 1. Cari User berdasarkan USERNAME saja
    const user = await queryOne(`
      SELECT u.*, c.name as dept_name, c.name_en as dept_name_en 
      FROM User u
      LEFT JOIN Category c ON u.departmentId = c.id
      WHERE u.username = ?
    `, [username]);

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
    
    await pool.execute('UPDATE User SET sessionId = ? WHERE id = ?', [sessionId, user.id]);

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
    await pool.execute(
      'INSERT INTO AuditLog (action, resource, resourceId, details, userId, ipAddress) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'LOGIN_SUCCESS',
        'User',
        user.id.toString(),
        JSON.stringify({ username: user.username, method: 'PASSWORD' }),
        user.id,
        request.headers.get('x-forwarded-for') || '127.0.0.1'
      ]
    );

    return NextResponse.json({
      message: 'Login berhasil',
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        fullName: user.fullName,
        email: user.email, 
        image_url: user.image_url,
        department: user.departmentId ? {
          id: user.departmentId,
          name: user.dept_name,
          name_en: user.dept_name_en
        } : null
      },
      token
    })

  } catch (error) {
    console.error("Login Error:", error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}