import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const session = await getSession(token)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Ambil data ringkasan
    const totalLinks = await prisma.link.count()
    const totalCategories = await prisma.category.count()
    const totalClicks = await prisma.clickLog.count()
    
    const uniqueIps = await prisma.clickLog.findMany({
      select: { ipAddress: true },
      distinct: ['ipAddress']
    })
    const totalEngagement = uniqueIps.length

    // 2. Ambil data link terpopuler
    const topLogs = await prisma.clickLog.groupBy({
      by: ['linkId'],
      _count: { linkId: true },
      orderBy: { _count: { linkId: 'desc' } },
      take: 20
    })

    const topLinkIds = topLogs.map(t => t.linkId)
    const linksData = await prisma.link.findMany({
      where: { id: { in: topLinkIds } },
      include: { category: true }
    })

    // 3. Bangun Header CSV
    let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8
    csvContent += "=== REKAP DATA DASHBOARD SIGAP ===\n\n";
    
    csvContent += "RINGKASAN UTAMA\n";
    csvContent += "Metrik,Nilai\n";
    csvContent += `Total Tautan Aktif,${totalLinks}\n`;
    csvContent += `Total Kategori,${totalCategories}\n`;
    csvContent += `Total Klik (Semua),${totalClicks}\n`;
    csvContent += `Total Engagement (IP Unik),${totalEngagement}\n\n`;

    csvContent += "TOP 20 TAUTAN TERPOPULER\n";
    csvContent += "Peringkat,Judul Tautan,Kategori,URL Asli,Total Klik,Status\n";

    topLogs.forEach((log, index) => {
      const link = linksData.find(l => l.id === log.linkId)
      if (link) {
        const title = (link.title || 'Tanpa Judul').replace(/,/g, ' ')
        const category = (link.category?.name || 'Umum').replace(/,/g, ' ')
        const status = link.is_active ? 'Aktif' : 'Nonaktif'
        csvContent += `${index + 1},${title},${category},${link.url},${log._count.linkId},${status}\n`;
      }
    })

    // 4. Return as File
    const date = new Date().toISOString().split('T')[0]
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=rekap-data-sigap-${date}.csv`
      }
    })

  } catch (error) {
    console.error("Export Error:", error)
    return NextResponse.json({ error: 'Gagal melakukan ekspor data' }, { status: 500 })
  }
}
