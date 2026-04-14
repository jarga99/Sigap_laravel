import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const session = await getSession(token)
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // 1. Ambil data kategori aktual & Filter berdasarkan Role
    let categories = []
    if (session.role === 'ADMIN') {
      categories = await prisma.category.findMany({ select: { id: true, name: true } })
    } else if (session.role === 'EMPLOYEE' && session.departmentId) {
      categories = await prisma.category.findMany({ 
        where: { id: Number(session.departmentId) },
        select: { id: true, name: true } 
      })
    }
    
    // 2. Buat Sheet 1: Template Data
    const templateData = [
      ['title', 'url', 'category_id', 'visibility', 'is_active', 'desc', 'slug'],
      ['Contoh Layanan Publik', 'https://google.com', categories[0]?.id || 1, 'SEMUA', 'true', 'Deskripsi layanan ini', ''],
      ['Layanan Internal Web', 'https://internal.site', categories[0]?.id || 1, 'INTERNAL', 'true', 'Hanya untuk akses pegawai', 'internal-web'],
    ]
    const wsTemplate = XLSX.utils.aoa_to_sheet(templateData)
    
    // 🔒 FREEZE HEADER (Baris Pertama)
    wsTemplate['!view'] = [{ state: 'frozen', ySplit: 1 }]

    // 3. Buat Sheet 2: Panduan & Referensi (Terminology Fix)
    const guideData = [
      ['PANDUAN PENGISIAN IMPORT MASSAL'],
      [],
      ['KOLOM', 'DESKRIPSI', 'PILIHAN / CONTOH'],
      ['title', 'Judul layanan yang akan tampil di portal', 'Teks bebas'],
      ['url', 'Alamat link asli tujuan', 'https://domain.com/...'],
      ['category_id', 'ID Kategori (Lihat tabel referensi di bawah)', 'Angka'],
      ['visibility', 'Siapa yang bisa melihat link ini', 'SEMUA, INTERNAL, KATEGORI'],
      ['is_active', 'Status tayang link', 'true (Aktif) / false (Draft)'],
      ['desc', 'Deskripsi singkat layanan', 'Teks bebas / biarkan kosong'],
      ['slug', 'Custom URL (Opsional)', 'Teks unik (misal: "e-kinerja") atau kosong'],
      [],
      ['--- REFERENSI ID KATEGORI ---'],
      ['ID', 'NAMA KATEGORI'],
      ...categories.map(c => [c.id, c.name]),
      [],
      ['--- PENJELASAN VISIBILITY ---'],
      ['SEMUA', 'Tampil untuk semua orang (Tamu/Guest/Login)'],
      ['INTERNAL', 'Hanya tampil jika sudah Login'],
      ['KATEGORI', 'Hanya tampil untuk pegawai di kategori tersebut'],
    ]
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData)
    wsGuide['!view'] = [{ state: 'frozen', ySplit: 3 }] // Freeze header panduan

    // 4. Gabungkan ke Workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Links')
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan & Referensi')

    // 5. Generate Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const response = new NextResponse(buffer)
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.headers.set('Content-Disposition', 'attachment; filename=template_import_links.xlsx')

    return response
  } catch (error) {
    console.error('[TEMPLATE_GEN_ERROR]', error)
    return NextResponse.json({ message: 'Gagal membuat template' }, { status: 500 })
  }
}
