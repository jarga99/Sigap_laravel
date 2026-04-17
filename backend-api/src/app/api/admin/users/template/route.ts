import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    // 1. Ambil data kategori aktual (untuk departmentId) via MySQL Native
    const categories = await query('SELECT id, name FROM Category ORDER BY name ASC')

    // 2. Buat Sheet 1: Template Data User
    const templateData = [
      ['username', 'password', 'fullName', 'departmentId'],
      ['budi_it', 'password123', 'Budi Santoso', 1],
      ['ani_staf', 'password321', 'Ani Wijaya', ''],
    ]
    const wsTemplate = XLSX.utils.aoa_to_sheet(templateData)

    // 3. Buat Sheet 2: Panduan & Referensi
    const guideData = [
      ['PANDUAN PENGISIAN IMPORT USER MASSAL'],
      [],
      ['KOLOM', 'DESKRIPSI', 'PILIHAN / CONTOH'],
      ['username', 'ID unik untuk login user', 'Teks (min 3 karakter)'],
      ['password', 'Kata sandi awal user', 'Minimal 6 karakter'],
      ['fullName', 'Nama lengkap pengguna', 'Teks bebas'],
      ['departmentId', 'ID Kategori/Departemen (Lihat tabel di bawah)', 'Angka (1, 2, dst)'],
      [],
      ['* Catatan: Semua user baru otomatis mendapatkan role EMPLOYEE demi keamanan.'],
      [],
      ['DAFTAR ID KATEGORI (DEPARTMENT ID) VALID:'],
      ['ID', 'NAMA KATEGORI'],
      ...categories.map((c: any) => [c.id, c.name]),
    ]
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData)

    // 4. Gabungkan ke Workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Daftar User')
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan & Referensi')

    // 5. Generate Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const response = new NextResponse(buffer)
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.headers.set('Content-Disposition', 'attachment; filename="template_import_users.xlsx"')

    return response
  } catch (error) {
    console.error('[USER_TEMPLATE_ERROR]', error)
    return NextResponse.json({ message: 'Gagal membuat template user' }, { status: 500 })
  }
}
