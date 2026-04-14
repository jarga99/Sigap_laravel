import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { itemId } = await request.json()
    if (!itemId) return NextResponse.json({ error: 'Item ID required' }, { status: 400 })

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

    // Increment click count and record log (Transaction)
    await prisma.$transaction([
      prisma.eventItem.update({
        where: { id: parseInt(itemId) },
        data: { clicks: { increment: 1 } }
      }),
      prisma.eventClickLog.create({
        data: {
          itemId: parseInt(itemId),
          ipAddress
        }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EVENT_CLICK_LOG]', error)
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 })
  }
}
