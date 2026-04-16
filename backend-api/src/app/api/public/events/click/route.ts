import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { itemId } = await request.json()
    if (!itemId) return NextResponse.json({ error: 'Item ID required' }, { status: 400 })

    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const id = parseInt(itemId);

    // Increment click count and record log (Native SQL Transaction)
    await connection.beginTransaction();

    // 1. Update Click Count
    await connection.execute(
      'UPDATE EventItem SET clicks = clicks + 1 WHERE id = ?',
      [id]
    );

    // 2. Create Click Log
    await connection.execute(
      'INSERT INTO EventClickLog (itemId, ipAddress, clickedAt) VALUES (?, ?, ?)',
      [id, ipAddress, new Date()]
    );

    await connection.commit();

    return NextResponse.json({ success: true })
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[EVENT_CLICK_LOG]', error)
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 })
  } finally {
    if (connection) connection.release();
  }
}
