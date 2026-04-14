const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const year = 2026;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  const count = await prisma.clickLog.count({
    where: { clickedAt: { gte: startDate, lte: endDate } }
  });
  console.log('Count for year', year, ':', count);
}
main().finally(() => prisma.$disconnect());
