import { NextResponse } from 'next/server'
import pool, { queryOne, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const eventId = parseInt(id)

    const event = await queryOne('SELECT * FROM \`Event\` WHERE id = ?', [eventId])
    if (!event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    const items = await query('SELECT * FROM EventItem WHERE eventId = ? ORDER BY \`order\` ASC', [eventId])
    
    return NextResponse.json({ ...event, items })
  } catch (error) {
    console.error('[EVENT_GET_ID]', error)
    return NextResponse.json({ error: 'Gagal mengambil detail event' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const connection = await pool.getConnection();
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const eventId = parseInt(id)
    const body = await request.json()
    
    const { 
      title, description, status, bgType, bgValue, profilePhoto, 
      showProfile, showCover, showTitle, showDescription, showFooter,
      profileShape, profileBorderStyle, profileBorderWidth, profileBgColor,
      profileWidth, profileHeight, coverHeight,
      titleColor, titleFont, descColor, descFont, footerColor, footerFont,
      buttonShape, buttonRadius, eventPhoto, footerText, 
      showSystemBranding, customBranding, customPoweredBy, items 
    } = body

    let { slug } = body

    // 1. Ambil data lama
    const oldEvent = await queryOne('SELECT * FROM \`Event\` WHERE id = ?', [eventId])
    if (!oldEvent) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    if (session.role === 'EMPLOYEE' && oldEvent.userId !== session.userId) {
      return NextResponse.json({ error: 'Anda hanya diperbolehkan mengedit event milik Anda sendiri' }, { status: 401 })
    }

    // Slug logic
    if (!slug || slug.trim() === '') {
      slug = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      if (!slug || slug === '-') slug = oldEvent.slug;
    } else {
      slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    const existing = await queryOne('SELECT id FROM \`Event\` WHERE slug = ? AND id != ?', [slug, eventId])
    if (existing) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })

    // 2. Transaksi SQL
    await connection.beginTransaction();

    const updateFields = {
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
      showSystemBranding: session.role === 'ADMIN' ? (showSystemBranding ?? oldEvent.showSystemBranding) : oldEvent.showSystemBranding,
      customBranding: session.role === 'ADMIN' ? (customBranding ?? oldEvent.customBranding) : oldEvent.customBranding,
      customPoweredBy: session.role === 'ADMIN' ? (customPoweredBy ?? oldEvent.customPoweredBy) : oldEvent.customPoweredBy,
      slug: slug || oldEvent.slug
    };

    const keys = Object.keys(updateFields);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = Object.values(updateFields);

    await connection.execute(`UPDATE \`Event\` SET ${setClause} WHERE id = ?`, [...values, eventId]);

    if (items && Array.isArray(items)) {
      const incomingIds = items.filter(i => i.id).map(i => i.id);
      if (incomingIds.length > 0) {
        await connection.execute('DELETE FROM EventItem WHERE eventId = ? AND id NOT IN (?)', [eventId, incomingIds]);
      } else {
        await connection.execute('DELETE FROM EventItem WHERE eventId = ?', [eventId]);
      }

      for (const item of items) {
        const itemData = [
          item.label, item.url, item.type || 'BUTTON', item.color, 
          item.textColor || '#ffffff', item.iconColor || '#ffffff', 
          item.icon, item.order || 0, item.layout || 'icon-left',
          item.showLabel !== undefined ? item.showLabel : true,
          item.isActive !== undefined ? item.isActive : true,
          eventId
        ];

        if (item.id) {
          await connection.execute(
            'UPDATE EventItem SET label=?, url=?, type=?, color=?, textColor=?, iconColor=?, icon=?, \`order\`=?, layout=?, showLabel=?, isActive=? WHERE id=? AND eventId=?',
            [...itemData.slice(0, 11), item.id, eventId]
          );
        } else {
          await connection.execute(
            'INSERT INTO EventItem (label, url, type, color, textColor, iconColor, icon, \`order\`, layout, showLabel, isActive, eventId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            itemData
          );
        }
      }
    }

    await connection.commit();

    // 📝 Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_EVENT',
      resource: 'Event',
      resourceId: eventId.toString(),
      details: { before: oldEvent, after: updateFields },
      ip: request.headers.get('x-forwarded-for')
    });

    const finalEvent = await queryOne('SELECT * FROM \`Event\` WHERE id = ?', [eventId]);
    const finalItems = await query('SELECT * FROM EventItem WHERE eventId = ? ORDER BY \`order\` ASC', [eventId]);

    return NextResponse.json({ ...finalEvent, items: finalItems });
  } catch (error: any) {
    await connection.rollback();
    console.error('[EVENT_PUT_ID]', error);
    return NextResponse.json({ error: 'Gagal memperbarui event', details: error.message }, { status: 500 });
  } finally {
    connection.release();
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

    const oldEvent = await queryOne('SELECT * FROM \`Event\` WHERE id = ?', [eventId])
    if (!oldEvent) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    if (session.role === 'EMPLOYEE' && oldEvent.userId !== session.userId) {
      return NextResponse.json({ error: 'Anda hanya diperbolehkan menghapus event milik Anda sendiri' }, { status: 401 })
    }

    await pool.execute('DELETE FROM \`Event\` WHERE id = ?', [eventId])

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
