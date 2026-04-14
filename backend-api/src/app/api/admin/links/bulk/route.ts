import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import crypto from 'crypto'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // 1. Baca Buffer & workbook
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer)
    
    // 2. Ambil sheet pertama (Template Data)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 3. Konversi ke JSON (Array of Objects)
    // header: 1 berarti baris pertama adalah header
    const data: any[] = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      return NextResponse.json({ error: 'File kosong atau tidak memiliki data' }, { status: 400 })
    }

    const createdLinks = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      // Bersihkan & Validasi
      const title = row.title?.toString().trim()
      const url = row.url?.toString().trim()

      if (!title || !url) {
        errors.push(`Baris ${i + 2}: Data tidak lengkap (Title/URL kosong)`)
        continue
      }

      try {
        const slug = row.slug?.toString().trim() || crypto.randomBytes(3).toString('hex')
        
        // 🔒 RBAC: Jika Employee, paksa category_id ke departmentId mereka
        let categoryId = row.category_id ? Number(row.category_id) : null
        if (session.role === 'EMPLOYEE') {
          categoryId = session.departmentId ? Number(session.departmentId) : categoryId
        }
        
        const newLink = await prisma.link.create({
          data: {
            title: title,
            url: url,
            slug: slug,
            category_id: categoryId,
            visibility: (row.visibility?.toString().toUpperCase() as any) || 'PUBLIC',
            // Handle boolean or numeric string
            is_active: row.is_active === true || row.is_active === 'true' || row.is_active === 1 || row.is_active === '1' || !row.is_active,
            desc: row.desc?.toString() || '',
            userId: session.userId
          }
        })
        createdLinks.push(newLink)
      } catch (err: any) {
        errors.push(`Baris ${i + 2} (${title}): ${err.message || 'Gagal diimpor'}`)
      }
    }

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'BULK_IMPORT_LINKS',
      resource: 'Link',
      details: { 
        successCount: createdLinks.length, 
        errorCount: errors.length,
        errors: errors.slice(0, 5) // Batasi log detail
      },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: `${createdLinks.length} link berhasil dimasukkan.`,
      successCount: createdLinks.length,
      errorCount: errors.length,
      errors: errors
    })

  } catch (error: any) {
    console.error('[API_BULK_IMPORT]', error)
    return NextResponse.json({ error: 'Gagal memproses bulk import', details: error.message }, { status: 500 })
  }
}
