import { PrismaClient, Role, EventStatus, Visibility } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function translateToEnglish(text: string | null) {
  if (!text) return null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is missing. Skipping translation.');
      return null;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Translate this Indonesian text to English. Only return the translated text, no quotes or additional info: "${text}"` }] }] })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('Translation error:', err);
    return null;
  }
}

function getRandomDateBetween(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Starting AI-Powered DB Seeder with Historical Data...');

  // 1. Total Cleanup
  await prisma.eventClickLog.deleteMany()
  await prisma.eventItem.deleteMany()
  await prisma.event.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.clickLog.deleteMany()
  await prisma.link.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.footerLink.deleteMany()

  const password = await bcrypt.hash('sigap2025', 10)

  // 2. Setup Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      username: 'sigap_admin',
      password,
      fullName: 'Administrator UPT BLK',
      role: Role.ADMIN,
      email: 'admin@blkpasuruan.go.id'
    }
  })

  // 3. Setup Categories (14 Kategori Spesifik)
  const categoriesData = [
    { name: 'Tata Usaha', icon: 'FileText' },
    { name: 'Pelatihan dan Sertifikasi', icon: 'Award' },
    { name: 'Pengembangan dan Pemasaran', icon: 'TrendingUp' },
    { name: 'Kejuruan TIK', icon: 'Monitor' },
    { name: 'Kejuruan Bisman', icon: 'Briefcase' },
    { name: 'Kejuruan Listrik', icon: 'Zap' },
    { name: 'Kejuruan Otomotif', icon: 'Truck' },
    { name: 'Kejuruan Elektro', icon: 'Cpu' },
    { name: 'Kejuruan Fashion Teknologi', icon: 'Scissors' },
    { name: 'Kejuruan Refrigerasi', icon: 'Wind' },
    { name: 'Kejuruan Tekmek', icon: 'Settings' },
    { name: 'Kejuruan PHP', icon: 'Waves' }, // PHP (Pemesinan)
    { name: 'Kejuruan Batik', icon: 'Palette' },
    { name: 'Kejuruan Tata Rias', icon: 'Heart' }
  ]

  const categories: any[] = []
  for (const cat of categoriesData) {
    console.log(`Translating Category: ${cat.name}`);
    const name_en = await translateToEnglish(cat.name);
    const created = await prisma.category.create({ 
      data: { ...cat, name_en } 
    })
    categories.push(created)
  }

  // 4. Setup Event Admins & Employees
  const eventAdminUsers: any[] = []
  for (let i = 1; i <= 2; i++) {
    const created = await prisma.user.create({
      data: {
        username: `admin_event${i}`,
        fullName: `Sub Bagian Tata Usaha ${i}`,
        role: Role.ADMIN_EVENT,
        password,
        email: `admin${i}@blkpasuruan.go.id`
      }
    })
    eventAdminUsers.push(created)
  }

  const employees: any[] = []
  const employeeNames = ['Wira', 'Dika', 'Putra', 'Sari', 'Ahmad', 'Siti', 'Budi', 'Ani', 'Joko', 'Lestari']
  for (let i = 0; i < employeeNames.length; i++) {
    const created = await prisma.user.create({
      data: {
        username: `pegawai${i + 1}`,
        fullName: employeeNames[i],
        role: Role.EMPLOYEE,
        password,
        email: `staff${i+1}@blkpasuruan.go.id`,
        departmentId: categories[i % categories.length].id
      }
    })
    employees.push(created)
  }

  // 5. Setup Links (Real URLs)
  const linkTemplates = [
    { title: 'Pendaftaran Pelatihan (Kios Ready)', slug: 'daftar-pelatihan', url: 'https://kemnaker.go.id', desc: 'Portal pendaftaran pelatihan kemnaker.' },
    { title: 'Portal Official UPT BLK', slug: 'blk-official', url: 'https://disnakertrans.jatimprov.go.id', desc: 'Website resmi BLK.' },
    { title: 'Zoom Online Class', slug: 'zoom-class', url: 'https://zoom.us', desc: 'Portal pembelajaran jarak jauh.' },
    { title: 'Grup WhatsApp Kejuruan', slug: 'wa-group', url: 'https://whatsapp.com', desc: 'Komunikasi antar peserta pelatihan.' },
    { title: 'Google Classroom', slug: 'g-classroom', url: 'https://classroom.google.com', desc: 'Manajemen tugas dan materi.' }
  ]

  const createdLinks: any[] = []
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const now = new Date();

  console.log('Generating 50+ Links with Real URLs...');
  for (let i = 0; i < 50; i++) {
    const tpl = linkTemplates[i % linkTemplates.length]
    const titleRaw = `${tpl.title} ${i + 1}`;
    const descRaw = tpl.desc || '';
    
    const title_en = await translateToEnglish(titleRaw);
    const desc_en = await translateToEnglish(descRaw);
    const randomDate = getRandomDateBetween(twoYearsAgo, now);

    const linkData = await prisma.link.create({
      data: {
        title: titleRaw,
        title_en,
        desc: descRaw,
        desc_en,
        slug: `${tpl.slug}-${i + 1}`,
        url: tpl.url,
        icon: 'ExternalLink',
        userId: i % 5 === 0 ? superAdmin.id : employees[i % employees.length].id,
        category_id: categories[i % categories.length].id,
        visibility: i % 3 === 0 ? Visibility.INTERNAL : Visibility.DEPARTMENT,
        is_active: true,
        createdAt: randomDate,
        updatedAt: randomDate
      }
    })
    createdLinks.push(linkData)
  }

  // 6. Setup Events
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Pelatihan Berbasis Kompetensi Angkatan ${i}`,
        slug: `pbk-blk-${i}`,
        description: `Dibuka pelatihan untuk kejuruan unggulan di UPT BLK Pasuruan angkatan ${i}.`,
        status: i % 2 === 0 ? EventStatus.AKTIF : EventStatus.TIDAK_AKTIF,
        userId: eventAdminUsers[i % 2].id,
        bgType: 'color',
        bgValue: '#0f172a',
        footerText: 'Disnakertrans Jawa Timur - UPT BLK Pasuruan',
        items: {
          create: [
            { label: 'Daftar Sekarang', url: 'https://google.com', type: 'BUTTON', order: 1 },
            { label: 'Panduan Pendaftaran', url: 'https://zoom.us', type: 'BUTTON', order: 2 },
            { label: 'Instagram BLK', url: 'https://instagram.com', type: 'SOCIAL', order: 3 }
          ]
        }
      }
    })
  }

  // 7. Settings (UPT BLK Pasuruan Profil)
  const instansi_name = 'UPT BLK Pasuruan';
  const instansi_desc = 'Dinas Tenaga Kerja dan Transmigrasi Provinsi Jawa Timur - Unit Pelaksana Teknis Balai Latihan Kerja Pasuruan.';
  const footer_text = 'Sistem Gerbang Akses Pintar - BLK Pasuruan';

  console.log('Translating Settings...');
  await prisma.settings.create({
    data: {
      instansi_name,
      instansi_name_en: await translateToEnglish(instansi_name),
      instansi_desc,
      instansi_desc_en: await translateToEnglish(instansi_desc),
      app_name: 'SIGAP BLK',
      footer_text,
      footer_text_en: await translateToEnglish(footer_text),
      footer_copyright: '© 2026 UPT BLK Pasuruan',
      contact_email: 'blk.pasuruan@jatimprov.go.id',
      contact_phone: '0343-421234',
      contact_address: 'Pasuruan, Jawa Timur'
    }
  })

  // 8. Dummy Logs for Stats
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_RESET',
      resource: 'GLOBAL',
      details: 'All data has been reset to AI-ready state.',
      userId: superAdmin.id
    }
  })

  // 9. Generate Historical Click Logs
  console.log('📊 Generating historical click logs for analytics test...');
  const clickLogsData: any[] = [];
  const accessRoles = ['ADMIN', 'EMPLOYEE', 'GUEST'];
  const testIps = ['192.168.1.1', '10.0.0.1', '127.0.0.1', '172.16.0.1'];
  
  for (let i = 0; i < 600; i++) {
    const randomLink = createdLinks[Math.floor(Math.random() * createdLinks.length)];
    const clickedAt = getRandomDateBetween(new Date(randomLink.createdAt), now);
    clickLogsData.push({
      clickedAt,
      userRole: accessRoles[i % accessRoles.length],
      ipAddress: testIps[i % testIps.length],
      linkId: randomLink.id
    });
  }
  
  await prisma.clickLog.createMany({
    data: clickLogsData
  });
  
  // Aggregate clicks & save to link
  for (const link of createdLinks) {
     const linkClicks = clickLogsData.filter(c => c.linkId === link.id).length;
     await prisma.link.update({ where: { id: link.id }, data: { clicks: linkClicks } });
  }

  // 10. Footer Quick Links
  console.log('🔗 Seeding Footer Quick Links...');
  await prisma.footerLink.createMany({
    data: [
      {
        label: 'Portal Berita Sigap',
        url: 'https://news.sigap.go.id',
        type: 'TEXT',
        order: 1,
        isActive: true
      },
      {
        label: 'Aduan Masyarakat',
        url: 'https://lapor.go.id',
        type: 'IMAGE',
        logoUrl: '/uploads/footer/sample-logo.png', // Placeholder
        order: 2,
        isActive: true
      }
    ]
  })

  console.log('🎉 Seeding completed! All _en fields and historical logs are successfully populated.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
