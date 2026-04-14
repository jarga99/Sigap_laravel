import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient()


import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'

import { callGemini, translateIndoToEnglish } from '@/lib/gemini'

// 🤖 Helper AI Translate
async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

// GET: Ambil semua kategori (Bersih dari logika visibility lama)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true } }
      }
    })
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 })
  }
}

// POST: Buat kategori baru
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon } = body
    let { name_en } = body

    if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })

    // 🤖 Jika name_en kosong, biarkan AI yang menerjemahkan
    if (!name_en) {
      name_en = await translateToEnglish(name)
    }

    const newCategory = await prisma.category.create({
      data: { name, name_en, icon }
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'CREATE_CATEGORY',
      resource: 'Category',
      resourceId: newCategory.id,
      details: { after: newCategory },
      departmentId: newCategory.id, // Untuk kategori, ID-nya sendiri adalah departemennya
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 })
  }
}