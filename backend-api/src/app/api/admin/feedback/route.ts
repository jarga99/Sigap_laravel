import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role ADMIN melihat semua, role lain hanya melihat feedback mereka sendiri via MySQL Native
    let whereClause = 'WHERE 1=1'
    let params: any[] = []

    if (session.role !== 'ADMIN') {
      whereClause = 'WHERE f.userId = ?'
      params = [session.userId]
    }

    const feedbacks = await query(`
      SELECT f.*, 
             u.username as user_username, 
             u.role as user_role,
             c.name as user_department_name
      FROM Feedback f
      LEFT JOIN User u ON f.userId = u.id
      LEFT JOIN Category c ON u.departmentId = c.id
      ${whereClause}
      ORDER BY f.createdAt DESC
    `, params);

    // Format data agar kompatibel dengan frontend yang mengharapkan include: { user: { department: { name } } }
    const formattedFeedbacks = feedbacks.map((fb: any) => ({
      ...fb,
      user: fb.userId ? {
        username: fb.user_username,
        role: fb.user_role,
        department: fb.user_department_name ? { name: fb.user_department_name } : null
      } : null
    }));

    return NextResponse.json(formattedFeedbacks);
  } catch (error: any) {
    console.error('Fetch Feedbacks Error:', error);
    return NextResponse.json({ error: 'Gagal memuat feedback: ' + error.message }, { status: 500 });
  }
}
