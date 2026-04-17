import { NextResponse } from 'next/server'
import pool, { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// GET: Ambil semua footer links untuk admin via MySQL Native
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const links = await query('SELECT * FROM FooterLink ORDER BY `order` ASC')
    return NextResponse.json(links)
  } catch (error) {
    console.error('[FOOTER_LINKS_GET_ERROR]', error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

// POST: Tambah footer link baru
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const label = (formData.get('label') as string) || ''
    const url = (formData.get('url') as string) || ''
    const type = (formData.get('type') as string) || 'TEXT'
    const order = parseInt(formData.get('order') as string) || 0
    const file = formData.get('logo') as File | null

    let logoUrl = null

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'footer')
      await mkdir(uploadDir, { recursive: true })
      
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const initials = session?.fullName
        ? session.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'SYS'
      const random = crypto.randomBytes(3).toString('hex')
      const ext = path.extname(file.name) || '.webp'
      const fileName = `FOOTER_${date}_${initials}_${random}${ext}`
      
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/footer/${fileName}`
    }

    // Insert via MySQL Native
    const [result]: any = await pool.execute(`
      INSERT INTO FooterLink (label, url, type, logoUrl, \`order\`, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [label, url, type, logoUrl, order, 1])

    const insertId = result.insertId

    // 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: insertId,
      details: { label, url, type, logoUrl, order },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ id: insertId, label, url, type, logoUrl, order, isActive: 1 })
  } catch (error) {
    console.error('[FOOTER_LINKS_POST_ERROR]', error)
    return NextResponse.json({ error: 'Gagal menambah tautan' }, { status: 500 })
  }
}
