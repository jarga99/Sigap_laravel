import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import * as bcrypt from 'bcryptjs'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // 1. Baca Buffer & workbook
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer)
    
    // 2. Ambil sheet pertama (Daftar User)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 3. Konversi ke JSON (Array of Objects)
    const data: any[] = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      return NextResponse.json({ error: 'File kosong atau tidak memiliki data' }, { status: 400 })
    }

    const createdUsers = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      const username = row.username?.toString().trim()
      const password = row.password?.toString().trim()
      const fullName = row.fullName?.toString().trim() || username
      const departmentId = row.departmentId ? Number(row.departmentId) : null

      // Validasi Dasar
      if (!username || !password) {
        errors.push(`Baris ${i + 2}: Username/Password kosong`)
        continue
      }

      if (username.length < 3) {
        errors.push(`Baris ${i + 2} (${username}): Username minimal 3 karakter`)
        continue
      }

      if (password.length < 6) {
        errors.push(`Baris ${i + 2} (${username}): Password minimal 6 karakter`)
        continue
      }

      // Validasi Dasar (Role tidak lagi divalidasi karena dipaksa EMPLOYEE)

      try {
        // Cek duplikasi
        const existing = await prisma.user.findUnique({ where: { username } })
        if (existing) {
          errors.push(`Baris ${i + 2} (${username}): Username sudah digunakan`)
          continue
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10)
        
        const newUser = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            fullName,
            role: 'EMPLOYEE', // Paksa role EMPLOYEE
            departmentId,
          }
        })
        createdUsers.push(newUser)
      } catch (err: any) {
        errors.push(`Baris ${i + 2} (${username}): ${err.message || 'Gagal diimpor'}`)
      }
    }

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'BULK_IMPORT_USERS',
      resource: 'User',
      details: { 
        successCount: createdUsers.length, 
        errorCount: errors.length,
        errors: errors.slice(0, 5) 
      },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: `${createdUsers.length} user berhasil dimasukkan.`,
      successCount: createdUsers.length,
      errorCount: errors.length,
      errors: errors
    })

  } catch (error: any) {
    console.error('[API_USER_BULK]', error)
    return NextResponse.json({ error: 'Gagal memproses bulk import user', details: error.message }, { status: 500 })
  }
}
