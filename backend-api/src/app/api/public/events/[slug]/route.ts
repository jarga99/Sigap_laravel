import { queryOne, query } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    
    // Ambil session untuk cek apakah yang akses adalah admin (agar bisa preview walau tidak aktif)
    const session = await getSession()
    // Admin dan Admin Event diizinkan melakukan preview walau status belum AKTIF
    const isAdmin = session && (session.role === 'ADMIN' || session.role === 'ADMIN_EVENT')

    let sql = 'SELECT * FROM `Event` WHERE slug = ?';
    const sqlParams: any[] = [slug];

    if (!isAdmin) {
      sql += ' AND status = ?';
      sqlParams.push('AKTIF');
    }

    const event = await queryOne(sql, sqlParams);

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan atau sudah berakhir' }, { status: 404 })
    }

    // Ambil item-item untuk event ini
    const items = await query('SELECT * FROM EventItem WHERE eventId = ? ORDER BY `order` ASC', [event.id]);

    return NextResponse.json({ ...event, items })
  } catch (error) {
    console.error('[PUBLIC_EVENT_GET]', error)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
