import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> } 
) {
  const { slug } = await params 
  
  // Ambil metadata pengunjung
  const headers = request.headers
  const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown'
  
  // Catatan: Karena ini redirect publik, kita asumsikan GUEST. 
  // Jika ingin mendeteksi USERNAME, butuh pengecekan Cookie Auth di sini (opsional).
  const userRole = 'GUEST' 

  try {
    // 1. Cari Link & Validasi Status Aktif
    const link = await prisma.link.findUnique({
      where: { slug: slug }
    })

    // Jika link tidak ada atau is_active = false, lempar ke Home
    if (!link || !link.is_active) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. Jalankan Tracking & Counter secara Atomik
    try {
      await prisma.$transaction([
        // A. Update total clicks di tabel Link
        prisma.link.update({
          where: { id: link.id },
          data: { clicks: { increment: 1 } }
        }),
        // B. Buat record baru di ClickLog (Menyesuaikan schema Anda)
        prisma.clickLog.create({
          data: {
            linkId: link.id,     // Sesuai schema: linkId
            ipAddress: ip.split(',')[0], // Sesuai schema: ipAddress
            userRole: userRole,   // Sesuai schema: userRole
            username: null        // Guest tidak punya username
          }
        })
      ])
    } catch (e) {
      // Jika tracking gagal (misal DB sibuk), redirect harus tetap jalan
      console.error('Tracking Error:', e)
    }

    // 3. Redirect ke URL tujuan
    let targetUrl = link.url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }
    return NextResponse.redirect(targetUrl)

  } catch (error) {
    console.error('Fatal Error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}