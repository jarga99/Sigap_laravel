import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import translate from 'translate'

// Konfigurasi engine penerjemah ke Google
translate.engine = 'google'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    })
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

    // Simpan ke database
    const newCategory = await prisma.category.create({
      data: {
        name: body.name,
        name_en: name_en // Hasil terjemahan mesin!
      }
    })

    return NextResponse.json(newCategory)
  } catch (error) {
    console.error("[API_CATEGORIES_POST]", error)
    return NextResponse.json({ error: 'Gagal menyimpan kategori' }, { status: 500 })
  }
}