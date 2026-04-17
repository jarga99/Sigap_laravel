import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// PUT: Perbarui footer link via MySQL Native
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const formData = await request.formData()
    
    const label = formData.get('label') as string
    const url = formData.get('url') as string
    const type = formData.get('type') as string
    const order = parseInt(formData.get('order') as string) || 0
    const isActive = formData.get('isActive') === 'true' ? 1 : 0
    const file = formData.get('logo') as File | null

    let logoUrl = formData.get('logoUrl') as string | null

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

    // Update via MySQL Native
    await pool.execute(`
      UPDATE FooterLink 
      SET label = ?, url = ?, type = ?, logoUrl = ?, \`order\` = ?, isActive = ? 
      WHERE id = ?
    `, [label, url, type, logoUrl, order, isActive, id])

    // Get updated data for response
    const updated = await queryOne('SELECT * FROM FooterLink WHERE id = ?', [id])

    // 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: id,
      details: { after: updated },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[FOOTER_LINK_PUT_ERROR]', error)
    return NextResponse.json({ error: 'Gagal memperbarui tautan' }, { status: 500 })
  }
}

// DELETE: Hapus footer link via MySQL Native
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    // Get before delete for log
    const beforeDeleted = await queryOne('SELECT * FROM FooterLink WHERE id = ?', [id])

    await pool.execute('DELETE FROM FooterLink WHERE id = ?', [id])

    // 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: id,
      details: { before: beforeDeleted },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Tautan berhasil dihapus' })
  } catch (error) {
    console.error('[FOOTER_LINK_DELETE_ERROR]', error)
    return NextResponse.json({ error: 'Gagal menghapus tautan' }, { status: 500 })
  }
}
