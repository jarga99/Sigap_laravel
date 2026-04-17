import { NextResponse } from 'next/server'
import pool, { query, queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let sql = `
      SELECT e.*, 
      (SELECT COUNT(*) FROM EventItem WHERE eventId = e.id) as item_count
      FROM \`Event\` e
    `;
    const params: any[] = [];

    if (status) {
      sql += ' WHERE e.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY e.createdAt DESC';

    const events = await query(sql, params);

    // Pastikan hasil selalu array, bahkan jika kosong
    // Dan map _count agar kompatibel dengan frontend yang mengharapkan prisma structure
    const formattedEvents = (events as any[]).map(e => ({
      ...e,
      _count: { items: e.item_count }
    }));

    return NextResponse.json(formattedEvents || [])
  } catch (error) {
    console.error('[EVENTS_GET]', error)
    return NextResponse.json({ error: 'Gagal mengambil data event' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, bgType, bgValue, slug: customSlug } = body

    if (!title) {
      return NextResponse.json({ error: 'Judul event wajib diisi' }, { status: 400 })
    }

    // Generate slug from title if not provided
    let slug = customSlug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 
               title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    if (!slug || slug === '-') {
      slug = crypto.randomBytes(4).toString('hex');
    }

    // Ensure unique slug
    const existing = await queryOne('SELECT id FROM \`Event\` WHERE slug = ?', [slug]);
    if (existing) {
      if (customSlug) {
        return NextResponse.json({ error: 'Slug sudah digunakan, silakan pilih yang lain' }, { status: 400 })
      }
      slug = slug + '-' + crypto.randomBytes(2).toString('hex')
    }

    const eventData = {
      title,
      description: description || null,
      slug,
      bgType: bgType || 'color',
      bgValue: bgValue || '#0f172a',
      profileShape: 'circle',
      profileBorderStyle: 'none',
      profileBorderWidth: 2,
      profileBgColor: '#ffffff',
      profileWidth: 80,
      profileHeight: 80,
      showProfile: 1, // Boolean di MySQL sering kali 1/0
      showCover: 1,
      showTitle: 1,
      showDescription: 1,
      showFooter: 1,
      coverHeight: 128,
      titleColor: '#ffffff',
      titleFont: 'Inter',
      descColor: '#ffffff',
      descFont: 'Inter',
      footerColor: '#ffffff',
      footerFont: 'Inter',
      buttonShape: 'rounded',
      buttonRadius: 12,
      status: 'TIDAK_AKTIF',
      userId: session.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const keys = Object.keys(eventData);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(k => `\`${k}\``).join(', ');
    const values = Object.values(eventData);

    const result = await pool.execute(
      `INSERT INTO \`Event\` (${columns}) VALUES (${placeholders})`,
      values
    );

    const insertId = (result[0] as any).insertId;
    const newEvent = await queryOne('SELECT * FROM \`Event\` WHERE id = ?', [insertId]);

    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_EVENT',
      resource: 'Event',
      resourceId: insertId.toString(),
      details: { after: newEvent },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(newEvent, { status: 201 })
  } catch (error) {
    console.error('[EVENTS_POST]', error)
    return NextResponse.json({ error: 'Gagal membuat event' }, { status: 500 })
  }
}
