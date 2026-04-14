import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Visibility } from '@prisma/client'
import crypto from 'crypto'

import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  let whereClause = {};

  // Jika bukan ADMIN, batasi hasil berdasarkan aturan visibilitas
  if (session?.role !== 'ADMIN') {
    const rawDeptId = session?.departmentId;
    const userDeptId = (rawDeptId !== null && rawDeptId !== undefined) ? Number(rawDeptId) : -1;
    
    whereClause = {
      OR: [
        { visibility: Visibility.INTERNAL },
        { 
          AND: [
            { visibility: Visibility.DEPARTMENT },
            { category_id: userDeptId }
          ]
        }
      ]
    };
  }

  const links = await prisma.link.findMany({
    where: whereClause,
    include: { 
      category: true, 
      createdBy: { select: { fullName: true, username: true } } 
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json(links)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validasi Field Wajib
    if (!body.title || !body.url || !body.category_id) {
      return NextResponse.json({ message: 'Title, URL, dan Kategori wajib diisi' }, { status: 400 })
    }

    // Cek duplikasi Slug
    let slug = body.slug
    if (!slug) {
      slug = crypto.randomBytes(3).toString('hex')
    }
    const existingSlug = await prisma.link.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json({ message: 'URL Short (Slug) ini sudah dipakai. Silakan gunakan yang lain.' }, { status: 400 })
    }

    // Cek duplikasi Judul (Title) persis sama
    const existingTitle = await prisma.link.findFirst({
      where: { title: body.title }
    })
    if (existingTitle) {
      return NextResponse.json({ message: 'Judul Layanan ini sudah terdaftar. Silakan gunakan judul lain.' }, { status: 400 })
    }

    const session = await getSession();
    // 🔒 Hanya Super Admin dan Pegawai yang bisa mengelola link (Sesuai mapping menu)
    if (!session || !['ADMIN', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ message: 'Akses Ditolak. Role Anda tidak diizinkan mengelola link.' }, { status: 403 });
    }

    const { title_en, desc, desc_en } = body;

    const newLink = await prisma.link.create({
      data: {
        title: body.title,
        title_en: title_en || '',
        url: body.url,
        slug: slug,
        visibility: body.visibility || 'INTERNAL',
        is_active: body.is_active ?? true,
        desc: desc || '',
        desc_en: desc_en || '',
        category: { connect: { id: Number(body.category_id) } },
        createdBy: { connect: { id: session.userId } }
      }
    })
    // ... dst

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'CREATE_LINK',
      resource: 'Link',
      resourceId: newLink.id,
      details: { after: newLink },
      departmentId: Number(body.category_id),
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    return NextResponse.json(newLink)
  } catch (error) {
    console.error('Create Error:', error)
    return NextResponse.json({ message: 'Gagal membuat link' }, { status: 500 })
  }
}