import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 1. Hash Password 'admin123'
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // 2. Update user admin
    const user = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        role: 'ADMIN'
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        fullName: 'Super Administrator',
        role: 'ADMIN'
      }
    })

    return NextResponse.json({ message: 'Password admin berhasil di-reset ke: admin123', user })
  } catch {
    return NextResponse.json({ error: 'Gagal reset' }, { status: 500 })
  }
}