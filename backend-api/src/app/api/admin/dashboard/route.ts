import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthStr = searchParams.get('month')
    const yearStr = searchParams.get('year')

    let dateFilter = {}
    if (monthStr && yearStr && monthStr !== 'all') {
      const year = parseInt(yearStr)
      const month = parseInt(monthStr) - 1
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0, 23, 59, 59)
      dateFilter = { clickedAt: { gte: startDate, lte: endDate } }
    } else if (yearStr) {
      const year = parseInt(yearStr)
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31, 23, 59, 59)
      dateFilter = { clickedAt: { gte: startDate, lte: endDate } }
    }

    // --- AUTH & VISIBILITY FILTER ---
    // Admin Event diizinkan masuk ke dashboard untuk melihat statistik umum

    let linkVisibilityWhere: any = {};

    if (session?.role !== 'ADMIN') {
      linkVisibilityWhere = {
        visibility: { in: ['INTERNAL'] }
      };
    }

    // 1. STATISTIK UTAMA (Kartu Atas)
    const totalLinks = await prisma.link.count({ where: linkVisibilityWhere })
    const totalCategories = await prisma.category.count()
    
    // Filter click logs berdasarkan link yang diizinkan (Publik/Internal untuk Pegawai)
    const totalClicks = await prisma.clickLog.count({ 
      where: { 
        ...dateFilter,
        link: linkVisibilityWhere
      } 
    })
    
    // Engagement: Unique IP Addresses logic
    const uniqueIps = await prisma.clickLog.findMany({
      where: {
        ...dateFilter,
        link: linkVisibilityWhere
      },
      select: { ipAddress: true },
      distinct: ['ipAddress']
    })
    const totalEngagement = uniqueIps.length
    
    // 2. DATA CHART: TOP 10 LINK TERPOPULER (Dinamis sesuai filter)
    const topLogs = await prisma.clickLog.groupBy({
      by: ['linkId'],
      where: {
        ...dateFilter,
        link: linkVisibilityWhere
      },
      _count: { linkId: true },
      orderBy: { _count: { linkId: 'desc' } },
      take: 10,
    })

    const topLinkIds = topLogs.map(t => t.linkId)
    const topLinksData = await prisma.link.findMany({
      where: { 
        id: { in: topLinkIds },
        ...linkVisibilityWhere
      },
      include: { category: { select: { name: true } } }
    })

    // HITUNG RINCIAN (GUEST vs USER) SECARA AGREGASI SKALA BESAR
    const roleStatsRaw = await prisma.clickLog.groupBy({
      by: ['linkId', 'userRole'],
      where: {
        linkId: { in: topLinkIds },
        ...dateFilter
      },
      _count: { _all: true }
    });

    const chartData = topLogs.map((tl) => {
      const link = topLinksData.find(l => l.id === tl.linkId)
      if (!link) return null

      let guestCount = 0;
      let userCount = 0;

      roleStatsRaw.forEach(stat => {
        if (stat.linkId === link.id) {
          if (stat.userRole === 'GUEST') {
            guestCount += stat._count._all;
          } else if (['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(stat.userRole)) {
            userCount += stat._count._all;
          }
        }
      });

      return {
        title: link.title, 
        category: link.category?.name || 'Umum',
        stats: {
          guest: guestCount,
          user: userCount,
          total: tl._count.linkId 
        }
      }
    })

    const filteredChartData = chartData.filter(c => c !== null)

    const topLinks = topLogs.map(tl => {
      const link = topLinksData.find(l => l.id === tl.linkId)
      return {
        ...link,
        clicks: tl._count.linkId
      }
    }).filter(l => l.id !== undefined)

    // 3. LINK TERBARU (Tabel Bawah)
    const recentLinks = await prisma.link.findMany({
      where: linkVisibilityWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { category: true }
    })

    return NextResponse.json({
      stats: { totalLinks, totalCategories, totalClicks, totalEngagement },
      chartData: filteredChartData,
      topLinks,
      recentLinks
    })

  } catch (error) {
    console.error("Dashboard Error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}