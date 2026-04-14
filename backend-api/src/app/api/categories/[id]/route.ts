import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import translate from 'translate'

translate.engine = 'google'
const prisma = new PrismaClient()

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const categoryId = Number(id)

    if (!body.name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })
    }

    // --- OTOMATISASI TRANSLATE ---
    let name_en = null
    try {
      name_en = await translate(body.name, { from: 'id', to: 'en' })
    } catch (translateError) {
      console.error("Gagal menerjemahkan:", translateError)
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: body.name,
        name_en: name_en
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("[API_CATEGORIES_PUT]", error)
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 })
  }
}

// DELETE: Hapus Kategori dengan Restriksi
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const categoryId = Number(id)

    // 1. CEK RESTRIKSI: Hitung jumlah link yang menggunakan kategori ini
    const linkedCount = await prisma.link.count({
      where: { category_id: categoryId }
    })

    // 2. Jika masih ada link, TOLAK penghapusan
    if (linkedCount > 0) {
      return NextResponse.json({ 
        error: `Tidak dapat menghapus: Masih ada ${linkedCount} link yang terdaftar di kategori ini. Hapus atau pindahkan link tersebut terlebih dahulu.` 
      }, { status: 400 })
    }

    // 3. Jika kosong, baru boleh dihapus
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ message: 'Kategori berhasil dihapus' })
  } catch (error) {
    console.error("[API_CATEGORIES_DELETE]", error)
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 })
  }
}