import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import * as bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const decoded = await getSession()
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    })

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image_url: user.image_url,
        department: user.department
      }
    })
  } catch (error) {
    console.error("[PROFILE_GET_ERROR]", error)
    return NextResponse.json({ error: 'Gagal memuat profil' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    // 1. Validasi Token
    const decoded = await getSession()
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const userId = decoded.userId

    // 2. Ambil FormData
    const formData = await request.formData()
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string
    const email = formData.get('email') as string
    const file = formData.get('image') as File | null // Ambil file dengan key 'image'

    // Ambil data user saat ini untuk record awal
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, string | number | null> = {}
    if (fullName) updateData.fullName = fullName
    if (email) updateData.email = email
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // 3. Proses Simpan File Jika Ada
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Tentukan lokasi: public/uploads/profiles
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
      
      // Buat folder jika belum ada
      await mkdir(uploadDir, { recursive: true })

      // Nama file unik
      const filename = `${userId}-${Date.now()}${path.extname(file.name)}`
      const filePath = path.join(uploadDir, filename)
      
      // Simpan file ke sistem
      await writeFile(filePath, buffer)
      console.log("File berhasil ditulis ke:", filePath)

      // Simpan path di database (Gunakan versi bersih)
      updateData.image_url = filename 
    }

    // 4. Update ke Database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: userId,
      action: 'UPDATE_PROFILE',
      resource: 'User',
      resourceId: userId,
      details: { // Catat apa saja yang berubah (kecuali password)
        fields: Object.keys(updateData).filter(k => k !== 'password')
      },
      departmentId: Number(updatedUser.departmentId) || null,
      ip: request.headers.get('x-forwarded-for')
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

  } catch {
    console.error("[PROFILE_UPDATE_ERROR]")
    return NextResponse.json({ error: 'Gagal update profil' }, { status: 500 })
  }
}