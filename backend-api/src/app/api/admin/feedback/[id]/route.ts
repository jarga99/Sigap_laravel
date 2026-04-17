import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'
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
    
    // Logic Data via MySQL Native
    let isRead = payload.isRead ? 1 : 0
    let replyMessage = payload.replyMessage || null
    let replyImageUrl = payload.replyImageUrl || null
    let repliedAt = null
    let repliedById = null

    if (payload.replyMessage) {
      repliedAt = new Date()
      repliedById = session.userId
      isRead = 1 // Otomatis tandai selesai jika dibalas
    }

    // Update via MySQL Native
    await pool.execute(`
      UPDATE Feedback 
      SET isRead = ?, replyMessage = ?, replyImageUrl = ?, repliedAt = ?, repliedById = ? 
      WHERE id = ?
    `, [isRead, replyMessage, replyImageUrl, repliedAt, repliedById, id]);

    // Ambil data terbaru untuk response
    const updated = await queryOne('SELECT * FROM Feedback WHERE id = ?', [id]);

    // 📝 Buat Notifikasi untuk User jika ini adalah balasan via MySQL Native
    if (payload.replyMessage && updated) {
      await pool.execute(`
        INSERT INTO Notification (userId, type, message, relatedId) 
        VALUES (?, ?, ?, ?)
      `, [updated.userId, 'FEEDBACK_REPLY', `Feedback Anda telah dibalas oleh Admin: "${payload.replyMessage.substring(0, 50)}..."`, id]);
    }

    // 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: payload.replyMessage ? 'REPLY_FEEDBACK' : 'UPDATE_FEEDBACK_STATUS',
      resource: 'Feedback',
      resourceId: id,
      details: { isRead: isRead, hasReply: !!payload.replyMessage },
      departmentId: null, 
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Feedback diperbarui', data: updated });
  } catch (error: any) {
    console.error('Update Feedback Error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui feedback: ' + error.message }, { status: 500 });
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

    // Get before delete for log
    const beforeDeleted = await queryOne('SELECT * FROM Feedback WHERE id = ?', [id]);

    await pool.execute('DELETE FROM Feedback WHERE id = ?', [id]);

    // 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_FEEDBACK',
      resource: 'Feedback',
      resourceId: id,
      details: { before: beforeDeleted },
      departmentId: null,
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Feedback berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete Feedback Error:', error);
    return NextResponse.json({ error: 'Gagal menghapus feedback: ' + error.message }, { status: 500 });
  }
}
