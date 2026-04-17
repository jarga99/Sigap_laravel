import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

    // --- DATE FILTER (SQL Native) ---
    let dateFilterSql = ''
    let dateParams: any[] = []

    if (monthStr && yearStr && monthStr !== 'all') {
      dateFilterSql = 'AND YEAR(clickedAt) = ? AND MONTH(clickedAt) = ?'
      dateParams = [parseInt(yearStr), parseInt(monthStr)]
    } else if (yearStr) {
      dateFilterSql = 'AND YEAR(clickedAt) = ?'
      dateParams = [parseInt(yearStr)]
    }

    // --- VISIBILITY FILTER (SQL Native) ---
    let linkVisibilitySql = ''
    if (session?.role !== 'ADMIN') {
      linkVisibilitySql = "AND visibility IN ('INTERNAL', 'SEMUA')" 
    }

    // 1. STATISTIK UTAMA (Aggregated Dashboard)
    const totalLinksRes: any = await query(`SELECT COUNT(*) as count FROM Link WHERE 1=1 ${linkVisibilitySql}`)
    const totalCategoriesRes: any = await query('SELECT COUNT(*) as count FROM Category')
    
    // Total Clicks with Date Filter
    const totalClicksRes: any = await query(`
      SELECT COUNT(*) as count 
      FROM ClickLog 
      WHERE linkId IN (SELECT id FROM Link WHERE 1=1 ${linkVisibilitySql})
      ${dateFilterSql}
    `, dateParams)
    
    // Engagement: Unique IPs
    const totalEngagementRes: any = await query(`
      SELECT COUNT(DISTINCT ipAddress) as count 
      FROM ClickLog 
      WHERE linkId IN (SELECT id FROM Link WHERE 1=1 ${linkVisibilitySql})
      ${dateFilterSql}
    `, dateParams)

    const stats = {
      totalLinks: totalLinksRes[0]?.count || 0,
      totalCategories: totalCategoriesRes[0]?.count || 0,
      totalClicks: totalClicksRes[0]?.count || 0,
      totalEngagement: totalEngagementRes[0]?.count || 0
    }
    
    // 2. DATA CHART: TOP 10 LINK TERPOPULER
    const topLogs = await query(`
      SELECT 
        l.id, l.title, c.name as categoryName,
        COUNT(cl.id) as totalClicks,
        SUM(CASE WHEN cl.userRole = 'GUEST' THEN 1 ELSE 0 END) as guestClicks,
        SUM(CASE WHEN cl.userRole IN ('ADMIN', 'ADMIN_EVENT', 'EMPLOYEE') THEN 1 ELSE 0 END) as userClicks
      FROM Link l
      LEFT JOIN Category c ON l.category_id = c.id
      JOIN ClickLog cl ON l.id = cl.linkId
      WHERE 1=1 
        ${linkVisibilitySql}
        ${dateFilterSql.replace('clickedAt', 'cl.clickedAt')}
      GROUP BY l.id
      ORDER BY totalClicks DESC
      LIMIT 10
    `, dateParams)

    const chartData = topLogs.map((tl: any) => ({
      title: tl.title,
      category: tl.categoryName || 'Umum',
      stats: {
        guest: Number(tl.guestClicks),
        user: Number(tl.userClicks),
        total: Number(tl.totalClicks)
      }
    }))

    const topLinks = topLogs.map((tl: any) => ({
      id: tl.id,
      title: tl.title,
      clicks: Number(tl.totalClicks)
    }))

    // 3. LINK TERBARU (Tabel Bawah)
    const recentLinks = await query(`
      SELECT l.*, c.name as category_name 
      FROM Link l 
      LEFT JOIN Category c ON l.category_id = c.id
      WHERE 1=1 ${linkVisibilitySql}
      ORDER BY l.createdAt DESC
      LIMIT 5
    `)

    return NextResponse.json({
      stats,
      chartData,
      topLinks,
      recentLinks: recentLinks.map((l: any) => ({
        ...l,
        category: l.category_name ? { name: l.category_name } : null
      }))
    })

  } catch (error: any) {
    console.error("Dashboard Error:", error)
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 })
  }
}