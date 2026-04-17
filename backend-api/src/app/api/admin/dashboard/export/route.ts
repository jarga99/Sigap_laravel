import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const session = await getSession(token)

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Ambil data ringkasan via MySQL Native
    const totalLinksRes: any = await query('SELECT COUNT(*) as count FROM Link')
    const totalCategoriesRes: any = await query('SELECT COUNT(*) as count FROM Category')
    const totalClicksRes: any = await query('SELECT COUNT(*) as count FROM ClickLog')
    const totalEngagementRes: any = await query('SELECT COUNT(DISTINCT ipAddress) as count FROM ClickLog')

    // 2. Ambil data link terpopuler via MySQL Native JOIN
    const topLinks = await query(`
      SELECT 
        l.title, l.url, l.is_active,
        c.name as categoryName,
        COUNT(cl.id) as totalClicks
      FROM Link l
      LEFT JOIN Category c ON l.category_id = c.id
      JOIN ClickLog cl ON l.id = cl.linkId
      GROUP BY l.id
      ORDER BY totalClicks DESC
      LIMIT 20
    `)

    // 3. Bangun Header CSV
    let csvContent = "\uFEFF"; 
    csvContent += "=== REKAP DATA DASHBOARD SIGAP ===\n\n";
    
    csvContent += "RINGKASAN UTAMA\n";
    csvContent += "Metrik,Nilai\n";
    csvContent += `Total Tautan Aktif,${totalLinksRes[0]?.count || 0}\n`;
    csvContent += `Total Kategori,${totalCategoriesRes[0]?.count || 0}\n`;
    csvContent += `Total Klik (Semua),${totalClicksRes[0]?.count || 0}\n`;
    csvContent += `Total Engagement (IP Unik),${totalEngagementRes[0]?.count || 0}\n\n`;

    csvContent += "TOP 20 TAUTAN TERPOPULER\n";
    csvContent += "Peringkat,Judul Tautan,Kategori,URL Asli,Total Klik,Status\n";

    topLinks.forEach((row: any, index: number) => {
      const title = (row.title || 'Tanpa Judul').replace(/,/g, ' ')
      const category = (row.categoryName || 'Umum').replace(/,/g, ' ')
      const status = row.is_active ? 'Aktif' : 'Nonaktif'
      csvContent += `${index + 1},${title},${category},${row.url},${row.totalClicks},${status}\n`;
    })

    // 4. Return as File
    const date = new Date().toISOString().split('T')[0]
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rekap-data-sigap-${date}.csv"`
      }
    })

  } catch (error: any) {
    console.error("Export Error:", error)
    return NextResponse.json({ error: 'Gagal melakukan ekspor data: ' + error.message }, { status: 500 })
  }
}
