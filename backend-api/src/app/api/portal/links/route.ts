import { NextResponse } from 'next/server'
import pool, { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let userRole = 'GUEST'
    let userDeptId: number | null = null;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return NextResponse.json({ error: 'Unauthorized Access. Silakan login.' }, { status: 401 })
    }

    try {
      const decoded = await getSession()
      if (decoded) {
        userRole = decoded.role
        userDeptId = decoded.departmentId ? Number(decoded.departmentId) : null 
      } else {
        return NextResponse.json({ error: 'Session tidak valid' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Token kadaluarsa atau tidak valid' }, { status: 401 })
    }

    // --- RBAC & VISIBILITY LOGIC (MySQL Native) ---
    let querySql = `
      SELECT l.*, c.name as category_name 
      FROM Link l 
      LEFT JOIN Category c ON l.category_id = c.id
    `
    let whereSql = 'WHERE 1=1'
    let params: any[] = []

    if (userRole !== 'ADMIN') {
      whereSql += ' AND l.is_active = 1'
      
      // Filter Visibility: Pegasus/Admin Event
      if (userRole === 'EMPLOYEE' || userRole === 'ADMIN_EVENT') {
        whereSql += " AND (l.visibility = 'INTERNAL' OR (l.visibility = 'DEPARTMENT' AND l.category_id = ?))"
        params.push(userDeptId ? Number(userDeptId) : -1)
      } else {
        // Guest (if ever allowed) or others only see public? 
        // Actual portal visibility usually depends on logic. 
        // Currently matching original Prisma logic: only INTERNAL & DEPARTMENT for logged in.
      }
    }

    const links = await query(`
      ${querySql}
      ${whereSql}
      ORDER BY l.category_id ASC, l.createdAt DESC
    `, params)

    // Format output agar kompatibel dengan frontend yang mengharapkan include: { category: true }
    const formattedLinks = links.map((l: any) => ({
      ...l,
      category: l.category_id ? { id: l.category_id, name: l.category_name } : null
    }))

    return NextResponse.json(formattedLinks)
  } catch (error: any) {
    console.error('[API_PORTAL_LINKS_GET]', error)
    return NextResponse.json({ error: 'Gagal memuat link: ' + error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validasi dasar
    if (!body.title || !body.url || !body.category_id) {
      return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 })
    }

    // Auto-Generate Slug via MySQL Logic
    let finalSlug = body.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    }

    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const visibility = body.visibility || 'INTERNAL'
    const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1

    // Insert via MySQL Native
    const [result]: any = await pool.execute(`
      INSERT INTO Link (title, title_en, \`desc\`, desc_en, url, slug, category_id, visibility, is_active, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      body.title, body.title_en || '', body.desc || '', body.desc_en || '', 
      body.url, finalSlug, Number(body.category_id), visibility, is_active, session.userId
    ])

    return NextResponse.json({
      id: result.insertId,
      ...body,
      slug: finalSlug,
      is_active: !!is_active
    })
  } catch (error: any) {
    console.error('[API_PORTAL_LINKS_POST]', error)
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })
    return NextResponse.json({ error: 'Gagal menyimpan link: ' + error.message }, { status: 500 })
  }
}