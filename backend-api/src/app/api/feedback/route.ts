import { NextResponse } from 'next/server'
import pool, { queryOne, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
    }

    const { message, isAnonymous, image } = await request.json();
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan feedback tidak boleh kosong.' }, { status: 400 });
    }

    // 3. Simpan Feedback
    const [result] = await pool.execute(
      'INSERT INTO Feedback (message, isAnonymous, imageUrl, userId) VALUES (?, ?, ?, ?)',
      [message.trim(), !!isAnonymous, image || null, session.userId]
    );
    const feedbackId = (result as any).insertId;

    // 🌟 3.1 Buat Notifikasi untuk para ADMIN
    try {
      const admins = await query('SELECT id FROM User WHERE role = ?', ['ADMIN']);

      if (admins.length > 0) {
        for (const admin of admins) {
          await pool.execute(
            'INSERT INTO Notification (userId, type, message, relatedId) VALUES (?, ?, ?, ?)',
            [
              admin.id,
              'NEW_FEEDBACK',
              `Ada masukan baru dari ${!!isAnonymous ? 'Anonim' : session.username}: "${message.substring(0, 50)}..."`,
              feedbackId
            ]
          );
        }
      }
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi admin:', notifyErr)
    }

    // 4. 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'SEND_FEEDBACK',
      resource: 'Feedback',
      resourceId: feedbackId,
      details: { isAnonymous: !!isAnonymous },
      departmentId: Number(session.departmentId) || null,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: 'Feedback berhasil dikirim.', 
      data: { id: feedbackId, message, isAnonymous, imageUrl: image } 
    });
  } catch (error: any) {
    console.error('Submit Feedback Error:', error);
    return NextResponse.json({ 
      error: 'Gagal mengirim feedback.', 
      details: error.message 
    }, { status: 500 });
  }
}
