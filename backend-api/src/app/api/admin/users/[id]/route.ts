import { NextResponse } from 'next/server'
import pool, { queryOne, query } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

// 1. PUT: Edit User
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id)
    const body = await request.json()

    // Ambil data lama untuk audit log & fallback
    const oldUser = await queryOne('SELECT * FROM User WHERE id = ?', [userId]);
    if (!oldUser) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    // Siapkan data update
    const updateFields: any = {
      role: (body.role && ['ADMIN_EVENT', 'EMPLOYEE'].includes(body.role)) ? body.role : oldUser.role,
      departmentId: body.departmentId ? Number(body.departmentId) : null,
      updatedAt: new Date()
    }

    // Jika input password, hash ulang
    if (body.password && body.password.length >= 6) {
      updateFields.password = await bcrypt.hash(body.password, 10)
    }

    const keys = Object.keys(updateFields);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = Object.values(updateFields);

    await query(
      `UPDATE User SET ${setClause} WHERE id = ?`,
      [...values, userId]
    );

    const updatedUser = await queryOne('SELECT * FROM User WHERE id = ?', [userId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_USER',
      resource: 'User',
      resourceId: userId,
      details: { after: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role, departmentId: updatedUser.departmentId } },
      departmentId: updatedUser.departmentId,
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'User updated' })
  } catch (error) {
    console.error("Update User Error:", error)
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 })
  }
}

// 2. DELETE: Hapus User
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession() 
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id)

    const oldUser = await queryOne('SELECT * FROM User WHERE id = ?', [userId]);
    if (!oldUser) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    await pool.execute('DELETE FROM User WHERE id = ?', [userId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: userId,
      details: { before: { id: oldUser.id, username: oldUser.username, role: oldUser.role } },
      departmentId: oldUser.departmentId,
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    console.error("Delete User Error:", error)
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}