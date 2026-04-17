import { NextResponse } from 'next/server'
import pool, { query, queryOne } from '@/lib/db'
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

// GET: Ambil semua kategori
export async function GET() {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'EMPLOYEE', 'ADMIN_EVENT'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await query(`
      SELECT c.*, 
      (SELECT COUNT(*) FROM Link WHERE category_id = c.id) as link_count
      FROM Category c
      ORDER BY c.createdAt DESC
    `);

    // Format agar struktur _count sesuai dengan yang diharapkan Frontend Vue
    const formattedCategories = (categories as any[]).map(c => ({
      ...c,
      _count: { links: c.link_count }
    }));

    return NextResponse.json(formattedCategories)
  } catch (error) {
    console.error('[CATEGORIES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 })
  }
}

// POST: Buat kategori baru
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Akses Ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { name, icon } = body
    let { name_en } = body

    if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })

    // 🤖 Jika name_en kosong, biarkan AI yang menerjemahkan
    if (!name_en) {
      name_en = await translateToEnglish(name)
    }

    const result = await pool.execute(
      'INSERT INTO Category (name, name_en, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [name, name_en || '', icon || '', new Date(), new Date()]
    );

    const insertId = (result[0] as any).insertId;
    const newCategory = await queryOne('SELECT * FROM Category WHERE id = ?', [insertId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'CREATE_CATEGORY',
      resource: 'Category',
      resourceId: insertId,
      details: { after: newCategory },
      departmentId: insertId,
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error('[CATEGORIES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 })
  }
}