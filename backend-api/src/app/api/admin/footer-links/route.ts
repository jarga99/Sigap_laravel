import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// GET: Ambil semua footer links untuk admin
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const links = await prisma.footerLink.findMany({
      orderBy: { order: 'asc' }
    })
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
    const label = formData.get('label') as string
    const url = formData.get('url') as string
    const type = (formData.get('type') as string) || 'TEXT'
    const order = parseInt(formData.get('order') as string) || 0
    const file = formData.get('logo') as File | null

    let logoUrl = null

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'footer')
      await mkdir(uploadDir, { recursive: true })
      
      const fileName = `${crypto.randomBytes(4).toString('hex')}-${Date.now()}${path.extname(file.name)}`
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, buffer)
      logoUrl = `/uploads/footer/${fileName}`
    }

    const newLink = await prisma.footerLink.create({
      data: {
        label,
        url,
        type,
        logoUrl,
        order,
        isActive: true
      }
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: newLink.id,
      details: { after: newLink },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(newLink)
  } catch (error) {
    console.error('[FOOTER_LINKS_POST_ERROR]', error)
    return NextResponse.json({ error: 'Gagal menambah tautan' }, { status: 500 })
  }
}
