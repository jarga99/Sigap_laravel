import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    // Only ADMIN (Super Admin) can reply
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const payload = await request.json();
    
    // Jika ada replyMessage, otomatis isRead menjadi true
    const updateData: any = { isRead: payload.isRead }
    if (payload.replyMessage) {
      updateData.replyMessage = payload.replyMessage
      if (payload.replyImageUrl) {
        updateData.replyImageUrl = payload.replyImageUrl
      }
      updateData.repliedAt = new Date()
      updateData.repliedById = session.userId
      updateData.isRead = true // Otomatis tandai selesai jika dibalas
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: updateData,
      include: { user: true }
    });

    // 📝 Buat Notifikasi untuk User jika ini adalah balasan
    if (payload.replyMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          type: 'FEEDBACK_REPLY',
          message: `Feedback Anda telah dibalas oleh Admin: "${payload.replyMessage.substring(0, 50)}..."`,
          relatedId: updated.id
        }
      })
    }

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: payload.replyMessage ? 'REPLY_FEEDBACK' : 'UPDATE_FEEDBACK_STATUS',
      resource: 'Feedback',
      resourceId: updated.id,
      details: { isRead: updateData.isRead, hasReply: !!payload.replyMessage },
      departmentId: null, 
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Feedback diperbarui', data: updated });
  } catch (error: any) {
    console.error('Update Feedback Error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui feedback.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const deleted = await prisma.feedback.delete({ where: { id } });

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_FEEDBACK',
      resource: 'Feedback',
      resourceId: id,
      details: { before: deleted },
      departmentId: null,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Feedback berhasil dihapus.' });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus feedback.' }, { status: 500 });
  }
}
