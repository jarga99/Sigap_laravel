import { NextResponse } from 'next/server'
import pool, { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil 20 notifikasi terbaru dengan JOIN ke Feedback via MySQL Native
    const notifications = await query(`
      SELECT n.*, f.message as feedback_message
      FROM Notification n
      LEFT JOIN Feedback f ON n.feedbackId = f.id
      WHERE n.userId = ?
      ORDER BY n.createdAt DESC
      LIMIT 20
    `, [session.userId]);

    // Format data agar kompatibel dengan frontend yang mengharapkan include: { feedback: { message } }
    const formattedNotifications = notifications.map((n: any) => ({
      ...n,
      feedback: n.feedbackId ? { message: n.feedback_message } : null
    }));

    // Hitung yang belum dibaca
    const countResult: any = await query(`
      SELECT COUNT(*) as unreadCount 
      FROM Notification 
      WHERE userId = ? AND isRead = 0
    `, [session.userId]);

    const unreadCount = countResult[0]?.unreadCount || 0;

    return NextResponse.json({ notifications: formattedNotifications, unreadCount });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal memuat notifikasi' }, { status: 500 });
  }
}

// Mark all as read via MySQL Native
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await pool.execute(
      'UPDATE Notification SET isRead = 1 WHERE userId = ? AND isRead = 0',
      [session.userId]
    );

    return NextResponse.json({ message: 'Semua notifikasi ditandai telah dibaca' });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Gagal memperbarui notifikasi' }, { status: 500 });
  }
}
