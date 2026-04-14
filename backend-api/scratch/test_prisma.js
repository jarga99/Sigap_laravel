const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
console.log('Event model exists:', !!prisma.event)
process.exit(0)
