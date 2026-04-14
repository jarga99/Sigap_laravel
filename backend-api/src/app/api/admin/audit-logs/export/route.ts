import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
      ip: request.headers.get('x-forwarded-for')
    })

    const { searchParams } = new URL(request.url)
    let whereClause: any = {}

    // --- ACCESS CONTROL LOGIC ---
    if (session.role === 'EMPLOYEE') {
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause = {
        OR: [
          { userId: session.userId },
          { departmentId: userDeptId }
        ]
      }
    }

    const action = searchParams.get('action')
    if (action && action !== 'all') whereClause.action = action

    // --- TIME FILTERING ---
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const day = searchParams.get('day')
    const dayEnd = searchParams.get('dayEnd')

    if (year) {
      const y = parseInt(year)
      let start: Date
      let end: Date

      if (day && month) {
        const m = parseInt(month) - 1
        const d = parseInt(day)
        const dEnd = dayEnd ? parseInt(dayEnd) : d
        
        start = new Date(y, m, d)
        end = new Date(y, m, dEnd + 1)
      } else if (month) {
        const m = parseInt(month) - 1
        start = new Date(y, m, 1)
        end = new Date(y, m + 1, 1)
      } else {
        start = new Date(y, 0, 1)
        end = new Date(y + 1, 0, 1)
      }

      whereClause.createdAt = {
        gte: start,
        lt: end
      }
    }

    // Fetch all logs without pagination for export
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to 1000 for safety, but usually enough for most exports
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[API_AUDIT_LOGS_EXPORT_GET]', error)
    return NextResponse.json({ message: 'Gagal memexport log' }, { status: 500 })
  }
}
