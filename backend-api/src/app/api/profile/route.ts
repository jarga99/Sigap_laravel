import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const oldPassword = body.oldPassword

    if (!oldPassword) {
      return NextResponse.json({ error: 'Password saat ini wajib diisi untuk verifikasi' }, { status: 400 })
    }

    // Ambil user via MySQL Native
    const user = await queryOne('SELECT * FROM User WHERE id = ?', [session.userId])

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    // Verifikasi Password Lama
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 })
    }

    // Logic Update via MySQL Native
    let username = body.username || user.username
    let fullName = body.fullName || user.fullName
    let hashedPassword = user.password

    // Jika user mau ganti password baru
    if (body.password && body.password.length >= 6) {
      hashedPassword = await bcrypt.hash(body.password, 10)
    }

    await pool.execute(`
      UPDATE User 
      SET username = ?, fullName = ?, password = ? 
      WHERE id = ?
    `, [username, fullName, hashedPassword, session.userId])
    
    return NextResponse.json({ message: 'Profil berhasil diupdate' })
  } catch (error: any) {
    console.error("Profile Update Error:", error)
    return NextResponse.json({ error: 'Gagal update profil: ' + error.message }, { status: 500 })
  }
}