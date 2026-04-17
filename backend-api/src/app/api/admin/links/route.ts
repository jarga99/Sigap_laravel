import { NextResponse } from 'next/server'
import pool, { query, queryOne } from '@/lib/db'
import crypto from 'crypto'

import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    let sql = `
      SELECT l.*, 
             c.name as category_name, c.name_en as category_name_en,
             u.fullName as creator_name, u.username as creator_username
      FROM Link l
      LEFT JOIN Category c ON l.category_id = c.id
      LEFT JOIN User u ON l.userId = u.id
    `;
    const params: any[] = [];

    // Jika bukan ADMIN, batasi hasil berdasarkan aturan visibilitas
    if (session?.role !== 'ADMIN') {
      const userDeptId = session?.departmentId ? Number(session.departmentId) : -1;
      
      sql += ` 
        WHERE l.visibility = 'INTERNAL' 
        OR (l.visibility = 'DEPARTMENT' AND l.category_id = ?)
      `;
      params.push(userDeptId);
    }

    sql += ' ORDER BY l.createdAt DESC';

    const links = await query(sql, params);
    
    // Format output agar UI Vue kaget (tetap kompatibel dengan struktur Prisma)
    const formattedLinks = (links as any[]).map(l => ({
      ...l,
      category: l.category_id ? { id: l.category_id, name: l.category_name, name_en: l.category_name_en } : null,
      createdBy: l.userId ? { fullName: l.creator_name, username: l.creator_username } : null
    }));

    return NextResponse.json(formattedLinks)
  } catch (error) {
    console.error('[LINKS_GET_ERROR]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    // 🔒 Hanya Super Admin, Admin Event, dan Pegawai yang bisa mengelola link
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ message: 'Akses Ditolak' }, { status: 403 });
    }

    const body = await request.json()

    // Validasi Field Wajib
    if (!body.title || !body.url || !body.category_id) {
      return NextResponse.json({ message: 'Title, URL, dan Kategori wajib diisi' }, { status: 400 })
    }

    // Cek duplikasi Slug
    let slug = body.slug
    if (!slug) {
      slug = crypto.randomBytes(3).toString('hex')
    }
    const existingSlug = await queryOne('SELECT id FROM Link WHERE slug = ?', [slug])
    if (existingSlug) {
      return NextResponse.json({ message: 'URL Short (Slug) ini sudah dipakai. Silakan gunakan yang lain.' }, { status: 400 })
    }

    // Cek duplikasi Judul (Title) persis sama
    const existingTitle = await queryOne('SELECT id FROM Link WHERE title = ?', [body.title])
    if (existingTitle) {
      return NextResponse.json({ message: 'Judul Layanan ini sudah terdaftar. Silakan gunakan judul lain.' }, { status: 400 })
    }

    const { title_en, desc, desc_en, visibility, is_active, category_id } = body;

    const linkData = {
      title: body.title,
      title_en: title_en || '',
      url: body.url,
      slug: slug,
      visibility: visibility || 'INTERNAL',
      is_active: is_active ?? 1,
      desc: desc || '',
      desc_en: desc_en || '',
      category_id: Number(category_id),
      userId: session.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const keys = Object.keys(linkData);
    const columns = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(linkData);

    const result = await pool.execute(
      `INSERT INTO Link (${columns}) VALUES (${placeholders})`,
      values
    );

    const insertId = (result[0] as any).insertId;
    const newLink = await queryOne('SELECT * FROM Link WHERE id = ?', [insertId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_LINK',
      resource: 'Link',
      resourceId: insertId,
      details: { after: newLink },
      departmentId: Number(category_id),
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    return NextResponse.json(newLink)
  } catch (error) {
    console.error('Create Error:', error)
    return NextResponse.json({ message: 'Gagal membuat link' }, { status: 500 })
  }
}