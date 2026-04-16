import { NextResponse } from 'next/server'
import pool, { queryOne } from '@/lib/db'

import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { callGemini, translateIndoToEnglish } from '@/lib/gemini'

// ==========================================
// 2. HELPER GEMINI AI
// ==========================================
async function translateToEnglish(text: string) {
  try {
    return await translateIndoToEnglish(text);
  } catch (err) {
    console.error("Gemini Translation Error:", err);
    return text;
  }
}

async function generateDescriptionID(title: string) {
  if (!title) return '';
  try {
    const prompt = `Buat deskripsi singkat, profesional, dan informatif dalam bahasa Indonesia (maksimal 2 kalimat) untuk aplikasi/layanan bernama "${title}". Langsung berikan hasilnya tanpa tanda kutip atau kata pengantar.`;
    return await callGemini(prompt) || '';
  } catch (err) {
    console.error("Gemini Suggestion Error:", err);
    return title;
  }
}

// ==========================================
// 3. ROUTE HANDLERS
// ==========================================

// GET
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const link = await queryOne(`
      SELECT l.*, c.name as category_name, c.name_en as category_name_en 
      FROM Link l
      LEFT JOIN Category c ON l.category_id = c.id
      WHERE l.id = ?
    `, [Number(id)]);

    if (!link) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 });

    // Format output category agar sesuai ekspektasi frontend
    const formattedLink = {
      ...link,
      category: link.category_id ? { id: link.category_id, name: link.category_name, name_en: link.category_name_en } : null
    };

    // 🔒 Keamanan: Jika bukan ADMIN, cek apakah boleh melihat link ini
    if (session?.role !== 'ADMIN') {
      if (link.visibility === 'DEPARTMENT' && link.category_id !== session?.departmentId) {
        return NextResponse.json({ message: 'Akses Ditolak. Link ini khusus departemen tertentu.' }, { status: 403 });
      }
    }

    return NextResponse.json(formattedLink)
  } catch (error) {
    console.error('[LINK_GET_ERROR]', error);
    return NextResponse.json({ message: 'Gagal memuat link' }, { status: 500 });
  }
}

// PUT (EDIT)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ message: 'Akses Ditolak' }, { status: 403 });
    }

    const { id } = await params
    const linkId = Number(id);

    // 🔒 CEK OTORISASI LINTAS DEPARTEMEN
    const oldLink = await queryOne('SELECT * FROM Link WHERE id = ?', [linkId]);
    if (!oldLink) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 })

    if (user.role === 'EMPLOYEE' && oldLink.category_id !== user.departmentId) {
      return NextResponse.json({ message: 'Akses Ditolak. Anda hanya bisa mengedit link dari departemen Anda sendiri.' }, { status: 403 })
    }

    const body = await request.json()
    
    // Cek duplikasi Slug
    if (body.slug) {
      const existingSlug = await queryOne('SELECT id FROM Link WHERE slug = ? AND id != ?', [body.slug, linkId])
      if (existingSlug) return NextResponse.json({ message: 'URL Short (Slug) ini sudah dipakai. Silakan gunakan yang lain.' }, { status: 400 })
    }

    // Cek duplikasi Judul (Title)
    if (body.title) {
      const existingTitle = await queryOne('SELECT id FROM Link WHERE title = ? AND id != ?', [body.title, linkId])
      if (existingTitle) return NextResponse.json({ message: 'Judul Layanan ini sudah terdaftar. Silakan gunakan judul lain.' }, { status: 400 })
    }

    let { title_en, desc, desc_en } = body;

    // ✨ Gemini AI Generation (Lazy)
    if (!desc && body.title) desc = await generateDescriptionID(body.title) || body.title;
    if (!title_en && body.title) title_en = await translateToEnglish(body.title) || body.title; 
    if (!desc_en && desc) desc_en = await translateToEnglish(desc) || desc; 

    const updateFields: any = {
      title: body.title || oldLink.title,
      title_en: title_en || oldLink.title_en || '',
      url: body.url || oldLink.url,
      slug: body.slug || oldLink.slug,
      visibility: body.visibility || oldLink.visibility,
      is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : oldLink.is_active,
      desc: desc || oldLink.desc || '',          
      desc_en: desc_en || oldLink.desc_en || '',    
      updatedAt: new Date()
    };

    if (body.category_id) {
       updateFields.category_id = Number(body.category_id);
    }

    const keys = Object.keys(updateFields);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = Object.values(updateFields);

    await pool.execute(
      `UPDATE Link SET ${setClause} WHERE id = ?`,
      [...values, linkId]
    );

    const updatedLink = await queryOne('SELECT * FROM Link WHERE id = ?', [linkId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'UPDATE_LINK',
      resource: 'Link',
      resourceId: linkId,
      details: { after: updatedLink },
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
  try {
    const user = await getSession()
    if (!user || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ message: 'Akses Ditolak' }, { status: 403 });
    }

    const { id } = await params
    const linkId = Number(id);

    // 🔒 CEK OTORISASI LINTAS DEPARTEMEN
    const targetLink = await queryOne('SELECT * FROM Link WHERE id = ?', [linkId]);
    if (!targetLink) return NextResponse.json({ message: 'Link tidak ditemukan' }, { status: 404 })

    if (user.role === 'EMPLOYEE' && targetLink.category_id !== user.departmentId) {
      return NextResponse.json({ message: 'Akses Ditolak. Anda hanya bisa menghapus link dari departemen Anda sendiri.' }, { status: 403 })
    }

    await pool.execute('DELETE FROM Link WHERE id = ?', [linkId]);

    // 📝 Record Audit Log
    recordAuditLog({
      userId: user.userId,
      action: 'DELETE_LINK',
      resource: 'Link',
      resourceId: linkId,
      details: { before: targetLink },
      departmentId: targetLink.category_id,
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ message: 'Gagal menghapus link' }, { status: 500 })
  }
}