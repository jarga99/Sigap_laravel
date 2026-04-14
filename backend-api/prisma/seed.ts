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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
      fullName: 'Administrator Utama',
      role: Role.ADMIN,
      email: 'admin@sigap.go.id'
    }
  })

  // 3. Setup Categories (AI Translation Testing: name_en = null)
  const categoriesData = [
    { name: 'Teknologi Informasi', icon: 'Monitor' },
    { name: 'Sumber Daya Manusia', icon: 'Users' },
    { name: 'Keuangan & Aset', icon: 'CreditCard' },
    { name: 'Layanan Publik', icon: 'Globe' },
    { name: 'Hukum & Regulasi', icon: 'Shield' },
    { name: 'Kesehatan & Keselamatan', icon: 'Activity' },
    { name: 'Pendidikan & Pelatihan', icon: 'BookOpen' },
    { name: 'Pariwisata & Budaya', icon: 'Camera' }
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
        fullName: `EO Specialist ${i}`,
        role: Role.ADMIN_EVENT,
        password,
        email: `event${i}@sigap.go.id`
      }
    })
    eventAdminUsers.push(created)
  }

  const employees: any[] = []
  const employeeNames = ['Andi', 'Siti', 'Bambang', 'Rina', 'Eko', 'Dewi', 'Fajar', 'Gita', 'Hadi', 'Indah']
  for (let i = 0; i < employeeNames.length; i++) {
    const created = await prisma.user.create({
      data: {
        username: `pegawai${i + 1}`,
        fullName: employeeNames[i],
        role: Role.EMPLOYEE,
        password,
        email: `pegawai${i+1}@sigap.go.id`,
        departmentId: categories[i % categories.length].id
      }
    })
    employees.push(created)
  }

  // 5. Setup Links (AI Translation Testing: title_en/desc_en = null)
  const linkTemplates = [
    { title: 'Sistem Kehadiran Online', slug: 'presensi', url: 'https://presensi.sigap.go.id', desc: 'Sistem absensi pegawai.' },
    { title: 'Portal Email Dinas', slug: 'email-dinas', url: 'https://mail.sigap.go.id', desc: 'Layanan email internal.' },
    { title: 'Dashboard Keuangan', slug: 'keuangan', url: 'https://finance.sigap.go.id', desc: 'Monitoring anggaran.' },
    { title: 'Layanan LPSE', slug: 'lpse', url: 'https://lpse.sigap.go.id', desc: 'Pengadaan barang/jasa.' }
  ]

  const createdLinks: any[] = []
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const now = new Date();

  console.log('Generating and Translating 40 Links...');
  for (let i = 0; i < 40; i++) {
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
        icon: 'Link',
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
        title: `Event Tahunan Sigap ${i}`,
        slug: `event-sigap-${i}`,
        description: `Deskripsi event ke-${i} untuk pengujian landing page.`,
        status: i % 2 === 0 ? EventStatus.AKTIF : EventStatus.TIDAK_AKTIF,
        userId: eventAdminUsers[i % 2].id,
        bgType: 'color',
        bgValue: '#0f172a',
        footerText: 'Powered by SIGAP Platform',
        items: {
          create: [
            { label: 'Daftar Sekarang', url: 'https://google.com', type: 'BUTTON', order: 1 },
            { label: 'Download Brosur', url: 'https://google.com', type: 'BUTTON', order: 2 },
            { label: 'Instagram', url: 'https://instagram.com', type: 'SOCIAL', order: 3 }
          ]
        }
      }
    })
  }

  // 7. Settings (AI Translation Applied)
  const instansi_name = 'Rumah Sakit Umum Daerah';
  const instansi_desc = 'Melayani dengan hati untuk kesehatan masyarakat.';
  const footer_text = 'Sistem Gerbang Akses Pintar';

  console.log('Translating Settings...');
  await prisma.settings.create({
    data: {
      instansi_name,
      instansi_name_en: await translateToEnglish(instansi_name),
      instansi_desc,
      instansi_desc_en: await translateToEnglish(instansi_desc),
      app_name: 'SIGAP',
      footer_text,
      footer_text_en: await translateToEnglish(footer_text),
      footer_copyright: '© 2026 SIGAP Team',
      contact_email: 'info@sigap.go.id',
      contact_phone: '021-12345678',
      contact_address: 'Jakarta, Indonesia'
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
