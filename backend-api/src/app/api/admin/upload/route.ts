import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import sharp from 'sharp'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = (formData.get('type') as string) || 'general'
    
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Deteksi tipe file
    const isImage = file.type.startsWith('image/')

    // Tentukan folder penyimpanan: public/uploads/{type}
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type)
    await mkdir(uploadDir, { recursive: true })

    // Buat Traceability Nama File: TYPE_DATE_INITIALS_RANDOM
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const userInitials = session.user.fullName
      .split(' ')
      .filter((n: string) => n.length > 0)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || 'NA'
    const randomHex = crypto.randomBytes(3).toString('hex')
    
    const fileExt = isImage ? '.webp' : (path.extname(file.name) || '.jpg')
    const fileName = `${type}_${dateStr}_${userInitials}_${randomHex}${fileExt}`
    const filePath = path.join(uploadDir, fileName)

    // Konversi dan simpan file
    if (isImage) {
      const processedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      await writeFile(filePath, processedBuffer)
    } else {
      await writeFile(filePath, buffer)
    }

    // Kembalikan URL publik
    return NextResponse.json({ url: publicUrl })

  } catch (error) {
    console.error('[UPLOAD_ERROR]', error)
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 })
  }
}
