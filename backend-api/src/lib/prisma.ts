import { PrismaClient } from '@prisma/client'

// Mencegah error "Too many connections" saat development (Hot Reload)
const globalForPrisma = global as unknown as { prisma: any }

/**
 * 🛡️ SAFE PRISMA INITIALIZATION
 * Jika engine binary gagal di-load, kita bungkus dalam try-catch agar tidak mematikan SELURUH aplikasi (503).
 */
function createSafePrismaClient() {
  try {
    return new PrismaClient();
  } catch (err: any) {
    console.error("🚨 [PRISMA_CRASH_PREVENTED] Gagal inisialisasi Prisma Client (Engine Error).");
    return new Proxy({}, {
      get: (target, prop) => {
        return () => {
          throw new Error(`Prisma tidak tersedia (Engine Error). Gunakan SQL murni untuk fitur ini. [Prop: ${String(prop)}]`);
        };
      }
    }) as unknown as PrismaClient;
  }
}

export const prisma = globalForPrisma.prisma || createSafePrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma