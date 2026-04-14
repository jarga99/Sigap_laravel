import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { callGemini } from '@/lib/gemini'

export async function POST(request: Request) {
  const session = await getSession()
  const allowedRoles = ['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE']
  
  if (!session || !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, type } = await request.json()
    if (!title) {
      return NextResponse.json({ error: 'Judul event diperlukan untuk konteks AI' }, { status: 400 })
    }

    let prompt = "";
    if (type === 'description') {
      prompt = `Buatkan deskripsi singkat, profesional, dan mengajak (maksimal 2 kalimat) untuk sebuah halaman event/link berjudul "${title}". Gunakan Bahasa Indonesia. Jangan gunakan tanda kutip, langsung berikan teksnya saja.`;
    } else if (type === 'footer') {
      prompt = `Buatkan pesan penutup (footer) yang hangat, singkat, dan sopan (maksimal 8 kata) untuk halaman portal event berjudul "${title}". Contoh: "Sampai jumpa di lokasi!" atau "Terima kasih telah bergabung". Gunakan Bahasa Indonesia. Jangan gunakan tanda kutip.`;
    } else {
      return NextResponse.json({ error: 'Invalid suggestion type' }, { status: 400 })
    }

    const suggestion = await callGemini(prompt)
    
    // Fallback jika Gemini gagal
    if (!suggestion) {
        if (type === 'description') {
          return NextResponse.json({ suggestion: `Selamat datang di ${title}! Temukan berbagai tautan dan informasi penting kami di sini.` })
        } else {
          return NextResponse.json({ suggestion: "Terima kasih telah berkunjung!" })
        }
    }

    return NextResponse.json({ suggestion })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
