const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const categories = await prisma.category.findMany()
  console.log('--- CATEGORIES ---')
  console.log(JSON.stringify(categories, null, 2))
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
