const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing AuditLog metadata query...')
    
    const actions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { _all: true }
    })
    console.log('Actions ok')

    const resources = await prisma.auditLog.groupBy({
      by: ['resource'],
      _count: { _all: true }
    })
    console.log('Resources ok')

    const yearsResult = await prisma.$queryRaw`
      SELECT DISTINCT YEAR(createdAt) as year 
      FROM AuditLog 
      ORDER BY year DESC
    `
    console.log('YearsResult:', yearsResult)
    
  } catch (err) {
    console.error('ERROR DETECTED:', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()
