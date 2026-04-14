import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { callGemini } from '@/lib/gemini'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { appName } = await request.json()
    if (!appName) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 })
    }

    const prompt = `Buatkan 1 slogan/tagline profesional, singkat, dan menarik untuk aplikasi portal layanan bernama "${appName}". Jangan gunakan tanda kutip, tanpa penjelasan, hanya slogan dalam Bahasa Indonesia.`;
    const tagline = await callGemini(prompt)
    
    return NextResponse.json({ tagline: tagline || "SIGAP: Layanan Cepat & Terpercaya" })
  } catch (error: any) {
    console.error("[GEMINI_TAGLINE_ERROR]", error.message);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada AI Server.' }, { status: 500 })
  }
}
