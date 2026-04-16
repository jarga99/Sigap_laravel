import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { translateIndoToEnglish } from '@/lib/gemini'

// 🤖 Helper AI Translate
async function translateToEnglish(text: string) {
  try {
    return await translateIndoToEnglish(text);
  } catch (err) {
    console.error("Gemini Translation Error:", err);
    return text;
  }
}

// PUT: Edit Kategori
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id)
    const user = await getSession()
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { name, icon } = body
    let { name_en } = body

    // 🤖 AI Translate
    if (!name_en && name) {
      name_en = await translateToEnglish(name)
    }

    const oldCategory = await queryOne('SELECT * FROM Category WHERE id = ?', [id]);
    if (!oldCategory) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

    await pool.execute(
      'UPDATE Category SET name = ?, name_en = ?, icon = ?, updatedAt = ? WHERE id = ?',
      [name || oldCategory.name, name_en || oldCategory.name_en, icon || oldCategory.icon, new Date(), id]
    );

    const updatedCategory = await queryOne('SELECT * FROM Category WHERE id = ?', [id]);

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
  } catch (error) {
    console.error('[CATEGORIES_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Gagal update kategori' }, { status: 500 })
  }
}

// DELETE: Hapus Kategori
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id)
    const user = await getSession()
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 })

    const oldCategory = await queryOne('SELECT * FROM Category WHERE id = ?', [id]);
    if (!oldCategory) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

    await pool.execute('DELETE FROM Category WHERE id = ?', [id]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'DELETE_CATEGORY',
      resource: 'Category',
      resourceId: id,
      details: { before: oldCategory },
      departmentId: id,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Category deleted' })
  } catch (error) {
    console.error('[CATEGORIES_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Gagal hapus kategori' }, { status: 500 })
  }
}