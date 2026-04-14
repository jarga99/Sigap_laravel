import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const visibilities = await prisma.link.groupBy({
    by: ['visibility'],
    _count: {
      id: true
    }
  })
  console.log("Visibilities in DB:", JSON.stringify(visibilities, null, 2))
  
  const sample = await prisma.link.findFirst({
    where: { visibility: 'DEPARTMENT' }
  })
  console.log("Sample DEPARTMENT link:", JSON.stringify(sample, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
