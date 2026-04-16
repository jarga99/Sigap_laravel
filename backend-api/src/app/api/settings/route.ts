import { NextResponse } from 'next/server'
import pool, { queryOne, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { callGemini, translateIndoToEnglish } from '@/lib/gemini'
import { isAuthorized, reportUnauthorized } from '@/lib/security'
import { headers } from 'next/headers'

async function translateToEnglish(text: string) {
  return await translateIndoToEnglish(text);
}

async function generateTagline(appName: string) {
  if (!appName) return null;
  const prompt = `Buatkan 1 slogan/tagline profesional, singkat, dan menarik untuk aplikasi portal layanan bernama "${appName}". Jangan gunakan tanda kutip, jangan beri penjelasan apapun, hanya slogan tersebut dalam Bahasa Indonesia.`;
  return await callGemini(prompt);
}

// 1. GET: Ambil data pengaturan
export async function GET() {
  try {
    const setting = await queryOne('SELECT * FROM Settings ORDER BY id ASC LIMIT 1')
    const footerLinks = await query('SELECT * FROM FooterLink WHERE isActive = 1 ORDER BY `order` ASC')

    const host = (await headers()).get('host') || ''
    const authorized = isAuthorized(host)
    
    // Heartbeat: Laporkan jika tidak sah (diam-diam)
    if (!authorized) {
      await reportUnauthorized(host, '/api/settings')
    }

    // 💊 POISON PILL: Modifikasi data jika ilegal
    const finalSetting = authorized ? setting : {
      ...setting,
      app_name: `${setting?.app_name || 'SIGAP'} (UNAUTHORIZED COPY)`,
      instansi_name: `[ILLEGAL] ${setting?.instansi_name || 'PORTAL'}`
    }

    return NextResponse.json({
      ...finalSetting,
      footerLinks,
      _license: {
        status: authorized ? 'VALID' : 'UNAUTHORIZED',
        host: host
      }
    })
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET Settings Error:", err)
    return NextResponse.json({ error: "Gagal memuat pengaturan" }, { status: 500 })
  }
}

// 2. PUT: Simpan / Update Pengaturan
// 2. PUT: Simpan / Update Pengaturan
export async function PUT(request: Request) {
  const session = await getSession()
  
  // Proteksi Lisensi (Stage A: Blokir perubahan jika ilegal)
  const host = (await headers()).get('host') || ''
  if (!isAuthorized(host)) {
    await reportUnauthorized(host, 'ATTEMPT_UPDATE_SETTINGS')
    return NextResponse.json({ error: 'License Unauthorized' }, { status: 403 })
  }

  // Proteksi: Pastikan yang akses adalah ADMIN
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    
    // 1. Ekstrak data teks utama (Wajib)
    const instansi_name = (formData.get('instansi_name') as string) || 'Instansi Pemerintah'
    const instansi_desc = formData.get('instansi_desc') as string | null
    const app_name = (formData.get('app_name') as string) || 'SIGAP'
    const footer_mode = (formData.get('footer_mode') as string) || 'COMPLEX'
    
    // 2. Ambil data input EN dari form (Bisa diisi manual atau kosong)
    let instansi_name_en = formData.get('instansi_name_en') as string | null
    let instansi_desc_en = formData.get('instansi_desc_en') as string | null
    let footer_text_en = formData.get('footer_text_en') as string | null

    // 3. 🤖 PROSES AUTO-TRANSLATE (Jika form EN dikosongkan)
    if (!instansi_name_en) {
      instansi_name_en = await translateToEnglish(instansi_name);
    }
    if (!instansi_desc_en && instansi_desc) {
      instansi_desc_en = await translateToEnglish(instansi_desc);
    }
    const footer_text_id = formData.get('footer_text') as string | null;

    // 4. 🤖 GENERATE TAGLINE (Jika dikosongkan)
    let final_footer_text = footer_text_id;
    if (!final_footer_text && app_name) {
      final_footer_text = await generateTagline(app_name);
    }

    if (!footer_text_en && final_footer_text) {
      footer_text_en = await translateToEnglish(final_footer_text);
    }

    // 4. Siapkan object data (Bebas dari redundansi _id)
    const dataToSave: Record<string, string | null> = {
      instansi_name,
      instansi_name_en, 
      instansi_desc,
      instansi_desc_en,
      custom_domain: formData.get('custom_domain') as string | null,
      
      // Ambil Field Baru
      app_name: app_name,
      footer_mode: footer_mode,
      footer_copyright: formData.get('footer_copyright') as string | null,
      footer_text: final_footer_text,
      footer_text_en: footer_text_en,
      contact_address: formData.get('contact_address') as string | null,
      contact_phone: formData.get('contact_phone') as string | null,
      contact_email: formData.get('contact_email') as string | null,
    }

    // Fungsi bantuan untuk upload file fisik
    const saveFile = async (file: File, prefix: string) => {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const initials = session?.user?.fullName
        ? session.user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'SYS'
      const random = Math.random().toString(36).substring(2, 8)
      const ext = path.extname(file.name) || '.webp'
      const filename = `${prefix.toUpperCase()}_${date}_${initials}_${random}${ext}`
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'settings')
      await mkdir(uploadDir, { recursive: true }) 
      
      const filepath = path.join(uploadDir, filename)
      await writeFile(filepath, buffer)
      
      return `/uploads/settings/${filename}`
    }

    // --- PROSES FILE LOGO & BG ---
    const logoFile = formData.get('logo') as File | null
    if (logoFile && logoFile.size > 0) {
      dataToSave.logo_url = await saveFile(logoFile, 'logo')
    } else {
      const logoUrlStr = formData.get('logo_url') as string | null
      if (logoUrlStr !== null) dataToSave.logo_url = logoUrlStr
    }

    const bgFile = formData.get('bg') as File | null
    if (bgFile && bgFile.size > 0) {
      dataToSave.bg_url = await saveFile(bgFile, 'bg')
    } else {
      const bgUrlStr = formData.get('bg_url') as string | null
      if (bgUrlStr !== null) dataToSave.bg_url = bgUrlStr
    }

    // --- SIMPAN KE DATABASE (Gunakan ID 1 secara konsisten) ---
    console.log("DEBUG: Mengupayakan simpan data settings via MySQL:", dataToSave);
    
    // Gunakan UPDATE untuk ID 1
    const keys = Object.keys(dataToSave);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = Object.values(dataToSave);

    await pool.execute(
      `UPDATE Settings SET ${setClause} WHERE id = 1`,
      [...values]
    );

    const updated = await queryOne('SELECT * FROM Settings WHERE id = 1');

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'UPDATE_SETTINGS',
      resource: 'Settings',
      resourceId: 1,
      details: { after: dataToSave },
      departmentId: null, // Settings bersifat global
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json(updated)

  } catch (error: unknown) {
    const err = error as any;
    // Audit error mendalam untuk diagnosa
    console.error("CRITICAL ERROR [PUT /api/settings]:", {
      message: err.message,
      stack: err.stack,
      code: err.code // Prisma error code (misal: P2002)
    });
    
    return NextResponse.json({ 
      error: "Gagal menyimpan pengaturan ke server",
      details: err.message 
    }, { status: 500 })
  }
}