import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// PUT: Perbarui footer link
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
    const isActive = formData.get('isActive') === 'true'
    const file = formData.get('logo') as File | null

    const updateData: any = {
      label,
      url,
      type,
      order,
      isActive
    }

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
      updateData.logoUrl = `/uploads/footer/${fileName}`
    } else {
      // Jika tidak ada file baru, tapi ada string logoUrl (misal reset atau keep)
      const existingLogo = formData.get('logoUrl') as string | null
      if (existingLogo !== undefined) {
        updateData.logoUrl = existingLogo
      }
    }

    const updated = await prisma.footerLink.update({
      where: { id },
      data: updateData
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: updated.id,
      details: { after: updated },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[FOOTER_LINK_PUT_ERROR]', error)
    return NextResponse.json({ error: 'Gagal memperbarui tautan' }, { status: 500 })
  }
}

// DELETE: Hapus footer link
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
    const deleted = await prisma.footerLink.delete({
      where: { id }
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_FOOTER_LINK',
      resource: 'FooterLink',
      resourceId: id,
      details: { before: deleted },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Tautan berhasil dihapus' })
  } catch (error) {
    console.error('[FOOTER_LINK_DELETE_ERROR]', error)
    return NextResponse.json({ error: 'Gagal menghapus tautan' }, { status: 500 })
  }
}
