import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

const prisma = new PrismaClient()

// 1. PUT: Edit User
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Cek Session: Hanya ADMIN yang boleh edit user
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // FIX: params di Next.js 15+ harus di-await jika error, tapi untuk aman parse int langsung
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id)
  const body = await request.json()

  // Siapkan data update
  const updateData: Record<string, string | number | null> = {
    role: 'EMPLOYEE', // Paksa role EMPLOYEE saat update (Cegah promosi ke ADMIN)
    // UPDATE: Gunakan departmentId, bukan subdivision string
    departmentId: body.departmentId ? Number(body.departmentId) : null
  }

  // Jika input password, hash ulang
  if (body.password && body.password.length >= 6) {
    updateData.password = await bcrypt.hash(body.password, 10)
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_USER',
      resource: 'User',
      resourceId: userId,
      details: { after: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role, departmentId: updatedUser.departmentId } },
      departmentId: updatedUser.departmentId,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'User updated' })
  } catch {
    console.error("Update Error")
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 })
  }
}

// 2. DELETE: Hapus User
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession() 
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id)

  try {
    const deletedUser = await prisma.user.delete({ where: { id: userId } })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: userId,
      details: { before: { id: deletedUser.id, username: deletedUser.username, role: deletedUser.role } },
      departmentId: deletedUser.departmentId,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'User deleted' })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}