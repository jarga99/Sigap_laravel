import { queryOne, query } from '@/lib/db'
import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> } 
) {
  const { slug } = await params 
  
  // Ambil metadata pengunjung
  const headers = request.headers
  const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown'
  const userRole = 'GUEST' 

  const connection = await pool.getConnection();

  try {
    // 1. Cari Link & Validasi Status Aktif
    const link = await queryOne('SELECT id, url, is_active FROM Link WHERE slug = ?', [slug]);

    // Jika link tidak ada atau is_active = false, lempar ke Home
    if (!link || !link.is_active) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. Jalankan Tracking & Counter secara Atomik (Transaction)
    try {
      await connection.beginTransaction();

      // A. Update total clicks
      await connection.execute(
        'UPDATE Link SET clicks = clicks + 1 WHERE id = ?',
        [link.id]
      );

      // B. Buat ClickLog
      await connection.execute(
        'INSERT INTO ClickLog (linkId, ipAddress, userRole, username, clickedAt) VALUES (?, ?, ?, ?, ?)',
        [link.id, ip.split(',')[0], userRole, null, new Date()]
      );

      await connection.commit();
    } catch (e) {
      if (connection) await connection.rollback();
      console.error('Tracking Error (ShortLink):', e)
    }

    // 3. Redirect ke URL tujuan
    let targetUrl = link.url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }
    return NextResponse.redirect(targetUrl)

  } catch (error) {
    console.error('Fatal Error (ShortLink):', error)
    return NextResponse.redirect(new URL('/', request.url))
  } finally {
    if (connection) connection.release();
  }
}