import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const oldPassword = body.oldPassword

  if (!oldPassword) {
    return NextResponse.json({ error: 'Password saat ini wajib diisi untuk verifikasi' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    // Verifikasi Password Lama
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 })
    }

    const updateData: Record<string, string | number | null> = { 
      username: body.username,
      fullName: body.fullName // Tambahkan ini agar fullName juga terupdate
    }

    // Jika user mau ganti password baru
    if (body.password && body.password.length >= 6) {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: updateData
    })
    
    return NextResponse.json({ message: 'Profil berhasil diupdate' })
  } catch (error) {
    console.error("Profile Update Error:", error)
    return NextResponse.json({ error: 'Gagal update profil' }, { status: 500 })
  }
}