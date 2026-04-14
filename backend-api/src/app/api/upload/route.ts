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

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    // 2. Proses File
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Deteksi tipe konten untuk menentukan kompresi gambar
    const isImage = file.type.startsWith('image/')
    
    // Buat nama file unik
    const baseFilename = `${Date.now()}-${file.name.replaceAll(' ', '_')}`
    const filename = isImage ? `${path.parse(baseFilename).name}.webp` : baseFilename
    
    // Tentukan lokasi simpan (folder public/uploads)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Pastikan folder ada
    await mkdir(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)
    
    // 3. Konversi dan Simpan File ke Harddisk
    if (isImage) {
      // Auto compress: convert to WebP, resize if width > 1200px
      const processedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      
      await writeFile(filepath, processedBuffer)
    } else {
      await writeFile(filepath, buffer)
    }

    // 4. Balikkan URL gambar
    const fileUrl = `/uploads/${filename}`

    return NextResponse.json({ url: fileUrl })

  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Gagal upload file' }, { status: 500 })
  }
}