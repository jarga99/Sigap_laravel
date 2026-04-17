import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
import { translateIndoToEnglish } from '@/lib/gemini'

async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    // 🤖 PROSES AUTO-TRANSLATE ULANG SAAT DI-EDIT
    let { title_en, desc_en } = body;

    // 🤖 PROSES AUTO-TRANSLATE
    if (!title_en && body.title) {
      title_en = await translateToEnglish(body.title);
    }
    if (!desc_en && body.desc) {
      desc_en = await translateToEnglish(body.desc);
    }

    const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1

    // Update via MySQL Native
    await pool.execute(`
      UPDATE Link 
      SET title = ?, title_en = ?, \`desc\` = ?, desc_en = ?, url = ?, slug = ?, category_id = ?, visibility = ?, is_active = ? 
      WHERE id = ?
    `, [
      body.title, title_en || '', body.desc || '', desc_en || '', 
      body.url, body.slug, body.category_id ? Number(body.category_id) : null,
      body.visibility, is_active, id
    ]);

    const updatedLink = await queryOne('SELECT * FROM Link WHERE id = ?', [id]);

    return NextResponse.json(updatedLink)
  } catch (error: any) {
    console.error("[API_LINKS_PUT]", error)
    return NextResponse.json({ error: 'Gagal update link: ' + error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    
    await pool.execute('DELETE FROM Link WHERE id = ?', [id]);
    
    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    console.error("[API_LINKS_DELETE]", error)
    return NextResponse.json({ error: 'Gagal hapus link: ' + error.message }, { status: 500 })
  }
}