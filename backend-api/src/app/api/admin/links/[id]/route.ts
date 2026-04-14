import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { callGemini, translateIndoToEnglish } from '@/lib/gemini'

// ==========================================
// 2. HELPER GEMINI AI
// ==========================================
async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

async function generateDescriptionID(title: string) {
  if (!title) return '';
  const prompt = `Buat deskripsi singkat, profesional, dan informatif dalam bahasa Indonesia (maksimal 2 kalimat) untuk aplikasi/layanan bernama "${title}". Langsung berikan hasilnya tanpa tanda kutip atau kata pengantar.`;
  return await callGemini(prompt) || '';
}

// ==========================================
// 3. ROUTE HANDLERS
// ==========================================

// GET
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const link = await prisma.link.findUnique({
    where: { id: Number(id) },
    include: { category: true }
  })

  if (!link) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 });

  // 🔒 Keamanan: Jika bukan ADMIN, cek apakah boleh melihat link ini
  if (session?.role !== 'ADMIN') {
    // 1. Jika visibilitasnya DEPARTMENT, wajib cek kesesuaian kategori
    if (link.visibility === 'DEPARTMENT') {
      if (link.category_id !== session?.departmentId) {
        return NextResponse.json({ message: 'Akses Ditolak. Link ini khusus departemen tertentu.' }, { status: 403 });
      }
    }
    
    // 2. Jika visibilitasnya INTERNAL, wajib sudah login (session ada)
    if (link.visibility === 'INTERNAL' && !session) {
       return NextResponse.json({ message: 'Akses Ditolak. Silakan login.' }, { status: 401 });
    }

    // Link bersifat INTERNAL atau DEPARTMENT
  }

  return NextResponse.json(link)
}

// PUT (EDIT)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  // 🔒 Hanya Super Admin dan Pegawai yang bisa mengelola link (Sesuai mapping menu)
  if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
    return NextResponse.json({ message: 'Akses Ditolak. Role Anda tidak diizinkan mengelola link.' }, { status: 403 });
  }

  const { id } = await params

  // 🔒 CEK OTORISASI LINTAS DEPARTEMEN
  if (user.role === 'EMPLOYEE') {
    const targetLink = await prisma.link.findUnique({ where: { id: Number(id) } })
    if (!targetLink) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 })

    // Validasi: Apakah category_id link ini SAMA dengan departmentId si Employee?
    if (targetLink.category_id !== user.departmentId) {
      return NextResponse.json({ message: 'Akses Ditolak. Anda hanya bisa mengedit link dari departemen Anda sendiri.' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    
    // Cek duplikasi Slug
    if (body.slug) {
      const existingSlug = await prisma.link.findFirst({
        where: { slug: body.slug, id: { not: Number(id) } }
      })
      if (existingSlug) return NextResponse.json({ message: 'URL Short (Slug) ini sudah dipakai. Silakan gunakan yang lain.' }, { status: 400 })
    }

    // Cek duplikasi Judul (Title) persis sama
    if (body.title) {
      const existingTitle = await prisma.link.findFirst({
        where: { title: body.title, id: { not: Number(id) } }
      })
      if (existingTitle) return NextResponse.json({ message: 'Judul Layanan ini sudah terdaftar. Silakan gunakan judul lain.' }, { status: 400 })
    }

    let { title_en, desc, desc_en } = body;

    if (!desc && body.title) desc = await generateDescriptionID(body.title) || body.title;
    if (!title_en && body.title) title_en = await translateToEnglish(body.title) || body.title; 
    if (!desc_en && desc) desc_en = await translateToEnglish(desc) || desc; 

    const updatedLink = await prisma.link.update({
      where: { id: Number(id) },
      data: {
        title: body.title,
        title_en: title_en || '',
        url: body.url,
        slug: body.slug,
        visibility: body.visibility || 'INTERNAL',
        is_active: body.is_active ?? true,
        desc: desc || '',          
        desc_en: desc_en || '',    
        ...(body.category_id && { category: { connect: { id: Number(body.category_id) } } })
      }
    })

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'UPDATE_LINK',
      resource: 'Link',
      resourceId: updatedLink.id,
      details: { // In a real system, we'd fetch 'before', but for now we log updated
        after: updatedLink 
      },
      departmentId: updatedLink.category_id,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(updatedLink)
  } catch (error) {
    console.error('PUT Error:', error)
    return NextResponse.json({ message: 'Error updating link' }, { status: 500 })
  }
}

// DELETE 
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  // 🔒 Hanya Super Admin dan Pegawai yang bisa mengelola link (Sesuai mapping menu)
  if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
    return NextResponse.json({ message: 'Akses Ditolak. Role Anda tidak diizinkan mengelola link.' }, { status: 403 });
  }

  const { id } = await params

  // 🔒 CEK OTORISASI LINTAS DEPARTEMEN
  if (user.role === 'EMPLOYEE') {
    const targetLink = await prisma.link.findUnique({ where: { id: Number(id) } })
    if (!targetLink) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 })

    // Validasi: Apakah category_id link ini SAMA dengan departmentId si Employee?
    if (targetLink.category_id !== user.departmentId) {
      return NextResponse.json({ message: 'Akses Ditolak. Anda hanya bisa menghapus link dari departemen Anda sendiri.' }, { status: 403 })
    }
  }

  const deletedLink = await prisma.link.delete({ where: { id: Number(id) } })

  // 📝 Record Audit Log
  recordAuditLog({
    userId: user.userId,
    action: 'DELETE_LINK',
    resource: 'Link',
    resourceId: id,
    details: { before: deletedLink },
    departmentId: deletedLink.category_id,
    ip: request.headers.get('x-forwarded-for')
  })

  return NextResponse.json({ message: 'Deleted' })
}