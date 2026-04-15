import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    
    // Ambil session untuk cek apakah yang akses adalah admin (agar bisa preview walau tidak aktif)
    const session = await getSession()
    // Admin dan Admin Event diizinkan melakukan preview walau status belum AKTIF
    const isAdmin = session && (session.role === 'ADMIN' || session.role === 'ADMIN_EVENT')

    const where: any = { slug }
    if (!isAdmin) {
      where.status = 'AKTIF'
    }

    const event = await prisma.event.findUnique({
      where,
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan atau sudah berakhir' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('[PUBLIC_EVENT_GET]', error)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
