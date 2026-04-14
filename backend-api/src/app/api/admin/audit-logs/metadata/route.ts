import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // --- ACCESS CONTROL LOGIC (Mirroring main list route) ---
    let whereClause: any = {}
    if (session.role === 'EMPLOYEE') {
      whereClause.userId = session.userId
    } else if (session.role === 'ADMIN_EVENT') {
      const userDeptId = session.departmentId ? Number(session.departmentId) : -1
      whereClause = {
        OR: [
          { userId: session.userId },
          { departmentId: userDeptId }
        ]
      }
    }

    // Ambil Action unik yang HANYA ada di data milik user
    const actions = await prisma.auditLog.groupBy({
      where: whereClause,
      by: ['action'],
      _count: { _all: true }
    })

    // Ambil Resource unik yang HANYA ada di data milik user
    const resources = await prisma.auditLog.groupBy({
      where: whereClause,
      by: ['resource'],
      _count: { _all: true }
    })

    // Ambil Tahun unik berdasarkan data milik user
    const recentLogs = await prisma.auditLog.findMany({
      where: whereClause,
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000 
    })
    
    const years = Array.from(new Set(recentLogs.map(l => new Date(l.createdAt).getFullYear())))
      .sort((a, b) => b - a)

    return NextResponse.json({
      actions: actions.map(a => a.action),
      resources: resources.map(r => r.resource),
      years: years
    })
  } catch (error: any) {
    console.error('[API_AUDIT_LOGS_METADATA_GET]', error)
    return NextResponse.json({ 
      error: 'Gagal memuat metadata log',
      details: error.message 
    }, { status: 500 })
  }
}
