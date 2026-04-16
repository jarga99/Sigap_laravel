import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

import { translateIndoToEnglish } from '@/lib/gemini'

// 🤖 Helper AI Translate
async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

// PUT: Edit Kategori
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id)
    const user = await getSession()
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Akses Ditolak. Hanya Admin atau Pegawai yang bisa mengelola kategori.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, icon } = body
    let { name_en } = body

    // 🤖 AI Translate
    if (!name_en && name) {
      name_en = await translateToEnglish(name)
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, name_en, icon } // Bersih dari visibility/targetSubdivision
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'UPDATE_CATEGORY',
      resource: 'Category',
      resourceId: id,
      details: { after: updatedCategory },
      departmentId: id,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Category updated', data: updatedCategory })
  } catch {
    return NextResponse.json({ error: 'Gagal update kategori' }, { status: 500 })
  }
}

// DELETE: Hapus Kategori
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id)
    const user = await getSession()
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) return NextResponse.json({ error: 'Akses Ditolak. Hanya Admin atau Pegawai yang bisa menghapus kategori.' }, { status: 403 })

    const deletedCategory = await prisma.category.delete({ where: { id } })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'DELETE_CATEGORY',
      resource: 'Category',
      resourceId: id,
      details: { before: deletedCategory },
      departmentId: id,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Category deleted' })
  } catch {
    return NextResponse.json({ error: 'Gagal hapus kategori' }, { status: 500 })
  }
}