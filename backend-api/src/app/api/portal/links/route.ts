import { NextResponse } from 'next/server'
import { Visibility, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// 🤖 AI Translator dihilangkan untuk optimalisasi performa tinggi

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let userRole = 'GUEST'
    let userDeptId: number | null = null;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return NextResponse.json({ error: 'Unauthorized Access. Silakan login.' }, { status: 401 })
    }

    try {
      const decoded = await getSession()
      if (decoded) {
        userRole = decoded.role
        userDeptId = decoded.departmentId ? Number(decoded.departmentId) : null 
      } else {
        return NextResponse.json({ error: 'Session tidak valid' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Token kadaluarsa atau tidak valid' }, { status: 401 })
    }

  let whereClause: Prisma.LinkWhereInput = {}

  if (userRole === 'ADMIN') {
    whereClause = {} 
  } else {
    whereClause.is_active = true
    if (userRole === 'EMPLOYEE' || userRole === 'ADMIN_EVENT') {
      whereClause.OR = [
        { visibility: Visibility.INTERNAL },
        { 
          AND: [
            { visibility: Visibility.DEPARTMENT },
            { category_id: userDeptId ? Number(userDeptId) : -1 }
          ]
        }
      ]
    }
  }

    const links = await prisma.link.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: [{ category_id: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(links)
  } catch {
    return NextResponse.json({ error: 'Gagal memuat link' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validasi dasar
    if (!body.title || !body.url || !body.category_id) {
      return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 })
    }

    // Auto-Generate Slug jika dibiarkan kosong oleh user
    let finalSlug = body.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    }

    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const newLink = await prisma.link.create({
      data: {
        title: body.title,
        title_en: body.title_en || '',
        desc: body.desc || '',
        desc_en: body.desc_en || '',
        url: body.url,
        slug: finalSlug,
        category_id: Number(body.category_id),
        visibility: body.visibility || Visibility.INTERNAL,
        is_active: body.is_active !== undefined ? body.is_active : true,
        userId: session.userId
      }
    })

    return NextResponse.json(newLink)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })
    return NextResponse.json({ error: 'Gagal menyimpan link' }, { status: 500 })
  }
}