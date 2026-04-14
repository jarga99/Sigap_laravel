import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    let whereClause: any = {}

    // --- ACCESS CONTROL LOGIC ---
    if (session.role === 'EMPLOYEE') {
      // Pegawai HANYA boleh melihat log miliknya sendiri
      whereClause.userId = session.userId
    } else if (session.role === 'ADMIN_EVENT') {
      // Admin Event boleh melihat log miliknya DAN log pegawai di departemen yang sama
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause = {
        OR: [
          { userId: session.userId },
          { departmentId: userDeptId }
        ]
      }
    }

    const action = searchParams.get('action')
    if (action) whereClause.action = action

    // --- TIME FILTERING ---
    const year = searchParams.get('year')
    const month = searchParams.get('month') // 1-12
    const day = searchParams.get('day') // 1-31
    const dayEnd = searchParams.get('dayEnd') // 1-31

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

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where: whereClause })
    ])

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[API_AUDIT_LOGS_GET]', error)
    return NextResponse.json({ message: 'Gagal memuat log' }, { status: 500 })
  }
}
