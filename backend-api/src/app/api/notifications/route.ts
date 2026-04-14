import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Ambil 20 terbaru
      include: {
        feedback: {
          select: {
            message: true
          }
        }
      }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memuat notifikasi' }, { status: 500 });
  }
}

// Mark all as read
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true }
    });

    return NextResponse.json({ message: 'Semua notifikasi ditandai telah dibaca' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal memperbarui notifikasi' }, { status: 500 });
  }
}
