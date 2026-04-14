const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const links = await prisma.link.findMany({ take: 5 });
  console.log('--- Links title_en check ---');
  links.forEach(l => console.log(`Title: ${l.title}, Title_EN: ${l.title_en}`));

  const settings = await prisma.settings.findFirst();
  console.log('\n--- Settings instansi_name_en check ---');
  console.log(`Name: ${settings.instansi_name}, Name_EN: ${settings.instansi_name_en}`);

  const categories = await prisma.category.findMany({ take: 5 });
  console.log('\n--- Categories name_en check ---');
  categories.forEach(c => console.log(`Name: ${c.name}, Name_EN: ${c.name_en}`));

  await prisma.$disconnect();
}

check();
