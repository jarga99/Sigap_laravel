import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import translate from 'translate'

translate.engine = 'google'

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

    // Update via MySQL Native
    await pool.execute(`
      UPDATE Category 
      SET name = ?, name_en = ? 
      WHERE id = ?
    `, [body.name, name_en, categoryId])

    // Get updated data for response
    const updated = await queryOne('SELECT * FROM Category WHERE id = ?', [categoryId])

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("[API_CATEGORIES_PUT]", error)
    return NextResponse.json({ error: 'Gagal memperbarui kategori: ' + error.message }, { status: 500 })
  }
}

// DELETE: Hapus Kategori dengan Restriksi via MySQL Native
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const categoryId = Number(id)

    // 1. CEK RESTRIKSI via MySQL Native
    const countResult: any = await queryOne('SELECT COUNT(*) as linkedCount FROM Link WHERE category_id = ?', [categoryId])
    const linkedCount = countResult?.linkedCount || 0

    // 2. Jika masih ada link, TOLAK penghapusan
    if (linkedCount > 0) {
      return NextResponse.json({ 
        error: `Tidak dapat menghapus: Masih ada ${linkedCount} link yang terdaftar di kategori ini. Hapus atau pindahkan link tersebut terlebih dahulu.` 
      }, { status: 400 })
    }

    // 3. Jika kosong, baru boleh dihapus
    await pool.execute('DELETE FROM Category WHERE id = ?', [categoryId])

    return NextResponse.json({ message: 'Kategori berhasil dihapus' })
  } catch (error: any) {
    console.error("[API_CATEGORIES_DELETE]", error)
    return NextResponse.json({ error: 'Gagal menghapus kategori: ' + error.message }, { status: 500 })
  }
}