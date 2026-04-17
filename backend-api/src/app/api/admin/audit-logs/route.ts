import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    // --- ACCESS CONTROL & FILTER LOGIC (MySQL Native) ---
    let whereClause = 'WHERE 1=1'
    let params: any[] = []

    if (session.role === 'EMPLOYEE') {
      whereClause += ' AND a.userId = ?'
      params.push(session.userId)
    } else if (session.role === 'ADMIN_EVENT') {
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause += ' AND (a.userId = ? OR a.departmentId = ?)'
      params.push(session.userId, userDeptId)
    }

    const action = searchParams.get('action')
    if (action) {
      whereClause += ' AND a.action = ?'
      params.push(action)
    }

    // --- TIME FILTERING (MySQL Native) ---
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const day = searchParams.get('day')
    const dayEnd = searchParams.get('dayEnd')

    if (year) {
      whereClause += ' AND YEAR(a.createdAt) = ?'
      params.push(parseInt(year))
      
      if (month) {
        whereClause += ' AND MONTH(a.createdAt) = ?'
        params.push(parseInt(month))
        
        if (day) {
          const d = parseInt(day)
          if (dayEnd) {
            whereClause += ' AND DAY(a.createdAt) BETWEEN ? AND ?'
            params.push(d, parseInt(dayEnd))
          } else {
            whereClause += ' AND DAY(a.createdAt) = ?'
            params.push(d)
          }
        }
      }
    }

    // 1. Ambil Log dengan JOIN ke User
    const logs = await query(`
      SELECT a.*, 
             u.fullName as user_fullName, 
             u.username as user_username, 
             u.role as user_role
      FROM AuditLog a
      LEFT JOIN User u ON a.userId = u.id
      ${whereClause}
      ORDER BY a.createdAt DESC
      LIMIT ${limit} OFFSET ${skip}
    `, params)

    // 2. Hitung Total untuk Pagination
    const totalRes: any = await query(`
      SELECT COUNT(*) as count FROM AuditLog a ${whereClause}
    `, params)
    const total = totalRes[0]?.count || 0

    // Format output agar kompatibel dengan frontend yang mengharapkan include: { user: { fullName... } }
    const formattedLogs = logs.map((log: any) => ({
      ...log,
      user: log.userId ? {
        fullName: log.user_fullName,
        username: log.user_username,
        role: log.user_role
      } : null
    }))

    return NextResponse.json({
      data: formattedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('[API_AUDIT_LOGS_GET]', error)
    return NextResponse.json({ message: 'Gagal memuat log: ' + error.message }, { status: 500 })
  }
}
