import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role ADMIN melihat semua, role lain hanya melihat feedback mereka sendiri
    const whereClause = session.role === 'ADMIN' ? {} : { userId: session.userId };

    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { username: true, role: true, department: { select: { name: true } } }
        }
      }
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Fetch Feedbacks Error:', error);
    return NextResponse.json({ error: 'Gagal memuat feedback.' }, { status: 500 });
  }
}
