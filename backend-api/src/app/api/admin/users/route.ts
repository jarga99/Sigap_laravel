import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

const prisma = new PrismaClient()

// Skema Validasi Update: Menyesuaikan database baru
// Frontend harus mengirim 'departmentId' (Int) bukan string subdivision manual
const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(['ADMIN_EVENT', 'EMPLOYEE']).optional(),
  // Ubah validasi: Terima departmentId sebagai angka (atau string yang bisa jadi angka)
  departmentId: z.union([z.string(), z.number()]).optional().transform((val) => val ? Number(val) : null), 
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      // HAPUS select manual, gunakan include untuk relasi
      include: {
        department: true // Ambil data kategori yang berelasi
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Mapping data
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      image_url: user.image_url,
      
      // LOGIC BARU: Ambil nama dari relasi department. Jika null, isi "-"
      // Ini menjaga agar Frontend tabel tidak error (karena masih panggil field subdivision)
      subdivision: user.department ? user.department.name : '-',
      departmentId: user.departmentId, // Kirim ID juga untuk keperluan edit nanti

      created_at: user.createdAt 
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error("GET Error:", error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const body = await request.json()

    // Validasi
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      const msg = validation.error.issues?.[0]?.message || "Data tidak valid"
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { username, password, departmentId, role } = validation.data

    // Cek Username
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Simpan ke Database (Gunakan departmentId)
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'EMPLOYEE', 
        // Masukkan ID kategori jika ada
        departmentId: departmentId || null, 
        fullName: username, 
      }
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: newUser.id,
      details: { after: { id: newUser.id, username: newUser.username, role: newUser.role, departmentId: newUser.departmentId } },
      departmentId: newUser.departmentId,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({
      message: 'User berhasil dibuat',
      user: newUser
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}