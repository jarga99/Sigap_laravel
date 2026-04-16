import { prisma } from '@/lib/prisma'

// Fungsi Helper (Disalin ke sini juga agar PUT bisa menggunakannya)
import { translateIndoToEnglish } from '@/lib/gemini'

// Fungsi Helper (Disalin ke sini juga agar PUT bisa menggunakannya)
async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    // 🤖 PROSES AUTO-TRANSLATE ULANG SAAT DI-EDIT
    let { title_en, desc_en } = body;

    // 🤖 PROSES AUTO-TRANSLATE
    if (!title_en && body.title) {
      title_en = await translateToEnglish(body.title);
    }
    if (!desc_en && body.desc) {
      desc_en = await translateToEnglish(body.desc);
    }
    const updatedLink = await prisma.link.update({
      where: { id },
      data: {
        title: body.title,
        title_en: title_en,
        desc: body.desc,
        desc_en: desc_en,
        url: body.url,
        slug: body.slug,
        category_id: body.category_id ? Number(body.category_id) : null,
        visibility: body.visibility,
        is_active: body.is_active
      }
    })

    return NextResponse.json(updatedLink)
  } catch {
    console.error("[API_LINKS_PUT]")
    return NextResponse.json({ error: 'Gagal update link' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    await prisma.link.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch {
    return NextResponse.json({ error: 'Gagal hapus link' }, { status: 500 })
  }
}