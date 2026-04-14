import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    return NextResponse.json(event)
  } catch (error) {
    console.error('[EVENT_GET_ID]', error)
    return NextResponse.json({ error: 'Gagal mengambil detail event' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const eventId = parseInt(id)
    const body = await request.json()
    
    // items: array of { id?, label, url, type, color, textColor, iconColor, order, layout, showLabel }
    const { 
      title, 
      description, 
      status, 
      bgType, 
      bgValue, 
      profilePhoto, 
      showProfile,
      showCover,
      showTitle,
      showDescription,
      showFooter,
      profileShape,
      profileBorderStyle,
      profileBorderWidth,
      profileBgColor,
      profileWidth,
      profileHeight,
      coverHeight,
      titleColor,
      titleFont,
      descColor,
      descFont,
      footerColor,
      footerFont,
      buttonShape,
      buttonRadius,
      eventPhoto, 
      footerText, 
      items 
    } = body

    let { slug } = body

    // 1. Ambil data lama untuk audit log & validasi izin
    const oldEvent = await prisma.event.findUnique({ where: { id: eventId }, include: { items: true } })
    if (!oldEvent) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    // Valisasi Otoritas Khusus Pegawai (Hanya boleh edit milik sendiri)
    if (session.role === 'EMPLOYEE' && oldEvent.userId !== session.userId) {
      return NextResponse.json({ error: 'Anda hanya diperbolehkan mengedit event milik Anda sendiri' }, { status: 401 })
    }

    // Generate slug from title if not provided
    if (!slug || slug.trim() === '') {
      slug = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      if (!slug || slug === '-') {
        slug = oldEvent.slug; // Fallback to old slug if gen fails
      }
    } else {
      slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    // Ensure unique slug (exclude current event)
    const existing = await prisma.event.findFirst({ 
      where: { 
        slug: slug,
        id: { not: eventId }
      } 
    })
    if (existing) {
      return NextResponse.json({ error: 'Slug sudah digunakan, silakan pilih yang lain' }, { status: 400 })
    }

    // 2. Update Event Metadata & Items (Transaction)
    const updatedEvent = await prisma.$transaction(async (tx) => {
      // Update metadata
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          title: title || oldEvent.title,
          description: description ?? oldEvent.description,
          status: status || oldEvent.status,
          bgType: bgType || oldEvent.bgType,
          bgValue: bgValue ?? oldEvent.bgValue,
          profilePhoto: profilePhoto ?? oldEvent.profilePhoto,
          showProfile: showProfile ?? true,
          showCover: showCover ?? true,
          showTitle: showTitle ?? true,
          showDescription: showDescription ?? true,
          showFooter: showFooter ?? true,
          profileShape: profileShape || oldEvent.profileShape,
          profileBorderStyle: profileBorderStyle || oldEvent.profileBorderStyle,
          profileBorderWidth: (profileBorderWidth != null && !isNaN(Number(profileBorderWidth))) ? Number(profileBorderWidth) : 2,
          profileBgColor: profileBgColor || '#ffffff',
          profileWidth: (profileWidth != null && !isNaN(Number(profileWidth))) ? Number(profileWidth) : 80,
          profileHeight: (profileHeight != null && !isNaN(Number(profileHeight))) ? Number(profileHeight) : 80,
          coverHeight: (coverHeight != null && !isNaN(Number(coverHeight))) ? Number(coverHeight) : 128,
          titleColor: titleColor || '#ffffff',
          titleFont: titleFont || 'Inter',
          descColor: descColor || '#ffffff',
          descFont: descFont || 'Inter',
          footerColor: footerColor || '#ffffff',
          footerFont: footerFont || 'Inter',
          buttonShape: buttonShape || 'rounded',
          buttonRadius: (buttonRadius != null && !isNaN(Number(buttonRadius))) ? Number(buttonRadius) : 12,
          eventPhoto: eventPhoto ?? oldEvent.eventPhoto, 
          footerText: footerText ?? oldEvent.footerText, 
          slug: slug || oldEvent.slug
        }
      })

      if (items && Array.isArray(items)) {
        // 1. Validasi: Jangan biarkan item tidak lengkap terkirim (kecuali DIVIDER yang memang tidak butuh URL)
        const hasInvalidItems = items.some(i => i.type !== 'DIVIDER' && (!i.label || !i.url));
        if (hasInvalidItems) {
           throw new Error('Semua link (kecuali pembatas) harus memiliki Nama dan URL yang valid.');
        }

        // 2. Sync Logic: Tentukan mana yang mau dihapus (yang tidak ada di list incoming)
        const incomingIds = items.filter(item => item.id).map(item => item.id)
        
        await tx.eventItem.deleteMany({
          where: {
            eventId: eventId,
            id: { notIn: incomingIds }
          }
        })

        // 3. Upsert items
        for (const item of items) {
          const itemData = {
            label: item.label,
            url: item.url,
            type: item.type || 'BUTTON',
            color: item.color,
            textColor: item.textColor || '#ffffff',
            iconColor: item.iconColor || '#ffffff',
            icon: item.icon,
            order: item.order || 0,
            layout: item.layout || 'icon-left',
            showLabel: item.showLabel !== undefined ? item.showLabel : true,
            isActive: item.isActive !== undefined ? item.isActive : true
          }

          if (item.id) {
            await tx.eventItem.update({
              where: { id: item.id },
              data: itemData
            })
          } else {
            await tx.eventItem.create({
              data: { ...itemData, eventId: eventId }
            })
          }
        }
      }

      return updated
    })

    // 📝 Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_EVENT',
      resource: 'Event',
      resourceId: eventId.toString(),
      details: { before: oldEvent, after: updatedEvent },
      ip: request.headers.get('x-forwarded-for')
    })

    // Fetch complete updated data to return to client
    const finalEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { items: { orderBy: { order: 'asc' } } }
    })

    return NextResponse.json(finalEvent)
  } catch (error: any) {
    console.error('[EVENT_PUT_ID]', error)
    return NextResponse.json({ error: 'Gagal memperbarui event', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const eventId = parseInt(id)

    const oldEvent = await prisma.event.findUnique({ where: { id: eventId } })
    if (!oldEvent) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    // Valisasi Otoritas Khusus Pegawai (Hanya boleh hapus milik sendiri)
    if (session.role === 'EMPLOYEE' && oldEvent.userId !== session.userId) {
      return NextResponse.json({ error: 'Anda hanya diperbolehkan menghapus event milik Anda sendiri' }, { status: 401 })
    }

    await prisma.event.delete({ where: { id: eventId } })

    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_EVENT',
      resource: 'Event',
      resourceId: eventId.toString(),
      details: { before: oldEvent },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Event berhasil dihapus' })
  } catch (error) {
    console.error('[EVENT_DELETE_ID]', error)
    return NextResponse.json({ error: 'Gagal menghapus event' }, { status: 500 })
  }
}
