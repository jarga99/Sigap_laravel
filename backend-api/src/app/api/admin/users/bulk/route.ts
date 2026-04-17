import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import bcrypt from 'bcryptjs'
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

    // --- LOGIC OPTIMIZATION START ---
    
    // A. Pre-fetch semua username yang ada untuk validasi cepat di memori
    const existingUsers = await pool.query('SELECT username FROM User')
    const existingSet = new Set((existingUsers[0] as any[]).map(u => u.username))

    const validRows: any[] = []
    const errors: string[] = []

    // B. Filter & Validasi Data di Memori (Sangat Cepat)
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const username = row.username?.toString().trim()
      const password = row.password?.toString().trim()
      const fullName = row.fullName?.toString().trim() || username
      const departmentId = row.departmentId ? Number(row.departmentId) : null
      const roleInput = row.role?.toString().toUpperCase().trim()
      const role = ['ADMIN_EVENT', 'EMPLOYEE'].includes(roleInput) ? roleInput : 'EMPLOYEE'

      if (!username || !password) {
        errors.push(`Baris ${i + 2}: Username/Password kosong`)
        continue
      }
      if (existingSet.has(username)) {
        errors.push(`Baris ${i + 2} (${username}): Username sudah digunakan`)
        continue
      }

      validRows.push({ username, password, fullName, role, departmentId })
    }

    if (validRows.length === 0) {
      return NextResponse.json({ 
        message: 'Tidak ada data baru yang bisa diimpor.',
        errorCount: errors.length,
        errors 
      }, { status: 400 })
    }

    // C. Parallel Hashing (Memanfaatkan ketersediaan Core CPU)
    // Gunakan p-limit jika data ribuan, untuk ratusan Promise.all sudah cukup
    const processedRows = await Promise.all(validRows.map(async (row) => {
      const hashedPassword = await bcrypt.hash(row.password, 10)
      const now = new Date()
      return [
        row.username, 
        hashedPassword, 
        row.fullName, 
        row.role, 
        row.departmentId, 
        now, 
        now
      ]
    }))

    // D. Batch Insert (1 Query untuk Semua)
    const [result]: any = await pool.query(`
      INSERT INTO User (username, password, fullName, role, departmentId, createdAt, updatedAt) 
      VALUES ?
    `, [processedRows]);

    const createdCount = result.affectedRows || 0

    // --- LOGIC OPTIMIZATION END ---

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'BULK_IMPORT_USERS',
      resource: 'User',
      details: { 
        successCount: createdCount, 
        errorCount: errors.length,
        errors: errors.slice(0, 10) 
      },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: `${createdCount} user berhasil diimpor.`,
      successCount: createdCount,
      errorCount: errors.length,
      errors: errors
    })

  } catch (error: any) {
    console.error('[API_USER_BULK]', error)
    return NextResponse.json({ error: 'Gagal memproses bulk import user', details: error.message }, { status: 500 })
  }
}
