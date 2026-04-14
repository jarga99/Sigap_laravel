const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    console.log("Checking settings...")
    const settings = await prisma.settings.findFirst()
    console.log("Settings found:", !!settings)
    
    console.log("Checking footerLinks...")
    const footerLinks = await prisma.footerLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
    console.log("FooterLinks count:", footerLinks.length)
    
    console.log("Success!")
  } catch (error) {
    console.error("DEBUG ERROR:", error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
