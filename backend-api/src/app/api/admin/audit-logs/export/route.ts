import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 📝 Record Audit Log (Fire and Forget)
    recordAuditLog({
      userId: session.userId,
      action: 'EXPORT_AUDIT_LOGS',
      resource: 'AuditLog',
      details: { timestamp: new Date().toISOString() },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    const { searchParams } = new URL(request.url)
    
    // --- ACCESS CONTROL & FILTER LOGIC (MySQL Native) ---
    let whereClause = 'WHERE 1=1'
    let params: any[] = []

    if (session.role === 'EMPLOYEE') {
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause += ' AND (a.userId = ? OR a.departmentId = ?)'
      params.push(session.userId, userDeptId)
    }

    const action = searchParams.get('action')
    if (action && action !== 'all') {
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

    // Fetch all logs without pagination for export via MySQL Native JOIN
    const logs = await query(`
      SELECT a.*, 
             u.fullName as user_fullName, 
             u.username as user_username, 
             u.role as user_role
      FROM AuditLog a
      LEFT JOIN User u ON a.userId = u.id
      ${whereClause}
      ORDER BY a.createdAt DESC
      LIMIT 1000
    `, params)

    // Format output agar kompatibel dengan frontend
    const formattedLogs = logs.map((log: any) => ({
      ...log,
      user: log.userId ? {
        fullName: log.user_fullName,
        username: log.user_username,
        role: log.user_role
      } : null
    }))

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    console.error('[API_AUDIT_LOGS_EXPORT_GET]', error)
    return NextResponse.json({ message: 'Gagal memexport log: ' + error.message }, { status: 500 })
  }
}
