import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import * as bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET() {
  try {
    const decoded = await getSession()
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await queryOne(`
        SELECT u.*, c.name as dept_name 
        FROM User u
        LEFT JOIN Category c ON u.departmentId = c.id
        WHERE u.id = ?
    `, [decoded.userId]);

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image_url: user.image_url,
        department: user.departmentId ? { id: user.departmentId, name: user.dept_name } : null
      }
    })
  } catch (error) {
    console.error("[PROFILE_GET_ERROR]", error)
    return NextResponse.json({ error: 'Gagal memuat profil' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const decoded = await getSession()
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const userId = decoded.userId

    const formData = await request.formData()
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string
    const email = formData.get('email') as string
    const file = formData.get('image') as File | null 

    const user = await queryOne('SELECT * FROM User WHERE id = ?', [userId])
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, string | number | null> = {}
    if (fullName) updateData.fullName = fullName
    if (email) updateData.email = email
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
      await mkdir(uploadDir, { recursive: true })

      const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const initials = user.fullName
        ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'USR'
      const random = Math.random().toString(36).substring(2, 8)
      const ext = path.extname(file.name) || '.webp'
      const filename = `PROFILE_${date}_${initials}_${random}${ext}`
      const filePath = path.join(uploadDir, filename)
      
      await writeFile(filePath, buffer)
      updateData.image_url = filename 
    }

    if (Object.keys(updateData).length > 0) {
      const keys = Object.keys(updateData);
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
      const values = Object.values(updateData);
      await pool.execute(`UPDATE User SET ${setClause} WHERE id = ?`, [...values, userId]);
    }

    const updatedUser = await queryOne('SELECT * FROM User WHERE id = ?', [userId])

    recordAuditLog({
      userId: userId,
      action: 'UPDATE_PROFILE',
      resource: 'User',
      resourceId: userId,
      details: {
        fields: Object.keys(updateData).filter(k => k !== 'password')
      },
      departmentId: Number(updatedUser.departmentId) || null,
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        image_url: updatedUser.image_url
      }
    })

  } catch (error: any) {
    console.error("[PROFILE_UPDATE_ERROR]", error)
    return NextResponse.json({ error: 'Gagal update profil', details: error.message }, { status: 500 })
  }
}