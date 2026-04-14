import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Pastikan hasil selalu array, bahkan jika kosong
    return NextResponse.json(events || [])
  } catch (error) {
    console.error('[EVENTS_GET]', error)
    return NextResponse.json({ error: 'Gagal mengambil data event' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, bgType, bgValue, slug: customSlug } = body

    if (!title) {
      return NextResponse.json({ error: 'Judul event wajib diisi' }, { status: 400 })
    }

    // Generate slug from title if not provided
    let slug = customSlug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 
               title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    if (!slug || slug === '-') {
      slug = crypto.randomBytes(4).toString('hex');
    }

    // Ensure unique slug
    const existing = await prisma.event.findUnique({ where: { slug } })
    if (existing) {
      if (customSlug) {
        return NextResponse.json({ error: 'Slug sudah digunakan, silakan pilih yang lain' }, { status: 400 })
      }
      slug = slug + '-' + crypto.randomBytes(2).toString('hex')
    }

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        slug,
        bgType: bgType || 'color',
        bgValue: bgValue || '#0f172a',
        profileShape: 'circle',
        profileBorderStyle: 'none',
        profileBorderWidth: 2,
        profileBgColor: '#ffffff',
        profileWidth: 80,
        profileHeight: 80,
        showProfile: true,
        showCover: true,
        showTitle: true,
        showDescription: true,
        showFooter: true,
        coverHeight: 128,
        titleColor: '#ffffff',
        titleFont: 'Inter',
        descColor: '#ffffff',
        descFont: 'Inter',
        footerColor: '#ffffff',
        footerFont: 'Inter',
        buttonShape: 'rounded',
        buttonRadius: 12,
        status: 'TIDAK_AKTIF',
        userId: session.userId
      }
    })

    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_EVENT',
      resource: 'Event',
      resourceId: newEvent.id.toString(),
      details: { after: newEvent },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(newEvent, { status: 201 })
  } catch (error) {
    console.error('[EVENTS_POST]', error)
    return NextResponse.json({ error: 'Gagal membuat event' }, { status: 500 })
  }
}
