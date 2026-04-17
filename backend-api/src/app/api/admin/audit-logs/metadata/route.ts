import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // --- ACCESS CONTROL LOGIC (MySQL Native) ---
    let whereClause = ''
    let params: any[] = []

    if (session.role === 'EMPLOYEE') {
      whereClause = 'WHERE userId = ?'
      params = [session.userId]
    } else if (session.role === 'ADMIN_EVENT') {
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause = 'WHERE userId = ? OR departmentId = ?'
      params = [session.userId, userDeptId]
    }

    // 1. Ambil Action unik via MySQL Native
    const actions = await query(`
      SELECT DISTINCT action 
      FROM AuditLog 
      ${whereClause}
      ORDER BY action ASC
    `, params)

    // 2. Ambil Resource unik via MySQL Native
    const resources = await query(`
      SELECT DISTINCT resource 
      FROM AuditLog 
      ${whereClause}
      ORDER BY resource ASC
    `, params)

    // 3. Ambil Tahun unik via MySQL Native (Lebih hemat memori daripada tarik ribuan baris)
    const yearResults = await query(`
      SELECT DISTINCT YEAR(createdAt) as year 
      FROM AuditLog 
      ${whereClause}
      ORDER BY year DESC
    `, params)
    
    return NextResponse.json({
      actions: actions.map((a: any) => a.action),
      resources: resources.map((r: any) => r.resource),
      years: yearResults.map((y: any) => y.year)
    })
  } catch (error: any) {
    console.error('[API_AUDIT_LOGS_METADATA_GET]', error)
    return NextResponse.json({ 
      error: 'Gagal memuat metadata log',
      details: error.message 
    }, { status: 500 })
  }
}
