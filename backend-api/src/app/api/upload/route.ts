import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/auth'
import sharp from 'sharp'

export async function POST(request: Request) {
  // 1. Cek Auth (Hanya Admin yang boleh upload)
  const session = await getSession()
  if (!session || !['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const type = (data.get('type') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    // 2. Proses File
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Deteksi tipe konten
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
    
    // Import crypto for random hex
    const crypto = require('crypto')
    const randomHex = crypto.randomBytes(3).toString('hex')
    
    const fileExt = isImage ? '.webp' : (path.extname(file.name) || '.jpg')
    const filename = `${type}_${dateStr}_${userInitials}_${randomHex}${fileExt}`
    const filepath = path.join(uploadDir, filename)
    
    // 3. Konversi dan Simpan File ke Harddisk
    if (isImage) {
      const processedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      
      await writeFile(filepath, processedBuffer)
    } else {
      await writeFile(filepath, buffer)
    }

    // 4. Balikkan URL gambar
    const fileUrl = `/uploads/${type}/${filename}`

    return NextResponse.json({ url: fileUrl })

  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Gagal upload file' }, { status: 500 })
  }
}