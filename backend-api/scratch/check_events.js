const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  try {
    const counts = await prisma.event.count()
    console.log('Total events:', counts)
    const all = await prisma.event.findMany({
      include: { _count: { select: { items: true } } }
    })
    console.log('Events retrieved successfully:', all.length)
  } catch (err) {
    console.error('FAILED TO FETCH EVENTS:', err.message)
  } finally {
    process.exit(0)
  }
}

check()
