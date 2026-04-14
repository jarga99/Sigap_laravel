import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    // 1. Cek Session di baris pertama untuk menjamin konteks header aman
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
    }

    // 2. Baca Body
    const { message, isAnonymous, image } = await request.json();
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan feedback tidak boleh kosong.' }, { status: 400 });
    }

    // 3. Simpan ke Database
    const feedback = await prisma.feedback.create({
      data: {
        message: message.trim(),
        isAnonymous: !!isAnonymous,
        imageUrl: image || null,
        userId: session.userId
      }
    });

    // 🌟 3.1 Buat Notifikasi untuk para ADMIN
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'NEW_FEEDBACK',
            message: `Ada masukan baru dari ${!!isAnonymous ? 'Anonim' : session.username}: "${message.substring(0, 50)}..."`,
            relatedId: feedback.id
          }))
        })
      }
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi admin:', notifyErr)
      // Jangan gagalkan feedback utama jika notifikasi gagal
    }

    // 4. 📝 Record Audit Log (Fire and Forget)
    recordAuditLog({
      userId: session.userId,
      action: 'SEND_FEEDBACK',
      resource: 'Feedback',
      resourceId: feedback.id,
      details: { isAnonymous: !!isAnonymous },
      departmentId: Number(session.departmentId) || null,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Feedback berhasil dikirim.', data: feedback });
  } catch (error: any) {
    console.error('Submit Feedback Error:', error);
    return NextResponse.json({ 
      error: 'Gagal mengirim feedback.', 
      details: error.message 
    }, { status: 500 });
  }
}
