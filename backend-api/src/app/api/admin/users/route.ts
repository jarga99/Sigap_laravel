import { NextResponse } from 'next/server'
import pool, { query, queryOne } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

// Skema Validasi Update: Menyesuaikan database baru
const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(['ADMIN_EVENT', 'EMPLOYEE']).optional(),
  departmentId: z.union([z.string(), z.number()]).optional().transform((val) => val ? Number(val) : null), 
})

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const users = await query(`
      SELECT u.*, c.name as dept_name 
      FROM User u
      LEFT JOIN Category c ON u.departmentId = c.id
      ORDER BY u.createdAt DESC
      LIMIT ${limit} OFFSET ${skip}
    `);

    // Hitung total untuk metadata pagination
    const countRes: any = await query('SELECT COUNT(*) as count FROM User')
    const total = countRes[0]?.count || 0

    // Mapping data agar kompatibel dengan Frontend Vue lama
    const formattedUsers = (users as any[]).map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      image_url: user.image_url,
      subdivision: user.dept_name || '-',
      departmentId: user.departmentId,
      created_at: user.createdAt 
    }))

    return NextResponse.json({
      data: formattedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("GET Users Error:", error)
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
    const existingUser = await queryOne('SELECT id FROM User WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Simpan ke Database (Gunakan departmentId)
    const result = await pool.execute(
      'INSERT INTO User (username, password, role, departmentId, fullName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role || 'EMPLOYEE', departmentId || null, username, new Date(), new Date()]
    );

    const insertId = (result[0] as any).insertId;
    const newUser = await queryOne('SELECT * FROM User WHERE id = ?', [insertId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: insertId,
      details: { after: { id: insertId, username: username, role: role || 'EMPLOYEE', departmentId: departmentId || null } },
      departmentId: departmentId || null,
      ipAddress: request.headers.get('x-forwarded-for')
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