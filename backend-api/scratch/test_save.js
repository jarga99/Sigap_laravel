const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  const eventId = 1
  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: 'Rekrutmen Update',
        showProfile: true, // Test this field
        items: {
          deleteMany: {}, // Test clearing items
          create: [
            { label: 'Link 1', url: 'https://google.com', color: '#ff0000', textColor: '#ffffff' }
          ]
        }
      }
    })
    console.log('SUCCESS:', updated.id)
  } catch (err) {
    console.error('ERROR:', err.message)
  } finally {
    process.exit(0)
  }
}

test()
