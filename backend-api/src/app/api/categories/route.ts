import { NextResponse } from 'next/server'
import pool, { query } from '@/lib/db'
import translate from 'translate'

// Konfigurasi engine penerjemah ke Google
translate.engine = 'google'

export async function GET() {
  try {
    const categories = await query('SELECT * FROM Category ORDER BY id ASC')
    return NextResponse.json(categories)
  } catch (error) {
    console.error("[API_CATEGORIES_GET]", error)
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validasi input dari frontend
    if (!body.name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })
    }

    // --- OTOMATISASI TRANSLATE ---
    let name_en = null
    try {
      // Terjemahkan dari id (Indonesia) ke en (Inggris)
      name_en = await translate(body.name, { from: 'id', to: 'en' })
    } catch (translateError) {
      console.error("Gagal menerjemahkan:", translateError)
      // Jika error internet/API translate, kita biarkan name_en null atau fallback ke bahasa aslinya.
    }

    // Simpan ke database via MySQL Native
    const [result]: any = await pool.execute(`
      INSERT INTO Category (name, name_en)
      VALUES (?, ?)
    `, [body.name, name_en])

    return NextResponse.json({
      id: result.insertId,
      name: body.name,
      name_en: name_en
    })
  } catch (error: any) {
    console.error("[API_CATEGORIES_POST]", error)
    return NextResponse.json({ error: 'Gagal menyimpan kategori: ' + error.message }, { status: 500 })
  }
}