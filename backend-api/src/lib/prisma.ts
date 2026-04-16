// 🛡️ NUCLEAR STERILIZATION PRISMA
// File ini dirancang agar TIDAK PERNAH memuat library Prisma ke RAM saat startup.
// Ini mencegah error "PrismaClientInitializationError" yang mematikan seluruh aplikasi.

const globalForPrisma = global as unknown as { prisma: any }

/**
 * Fungsi ini menggunakan Dynamic Import atau Lazy Loading.
 * Selama tidak ada kode yang memanggil 'prisma.user...', maka library Prisma 
 * sama sekali tidak akan pernah di-load oleh Node.js.
 */
function createNuclearSafePrismaClient() {
  if (typeof window !== 'undefined') return {} as any;

  return new Proxy({}, {
    get: (target: any, prop: string) => {
      // Lazy initialization saat properti pertama kali diakses
      if (!target._instance && !target._failed) {
        try {
          console.log(`[PRISMA_NUCLEAR] Mencoba memuat library secara dinamis untuk: ${prop}`);
          // Menggunakan require secara lokal di dalam trap agar tidak kena top-level search
          const { PrismaClient } = require('@prisma/client');
          target._instance = new PrismaClient();
        } catch (err: any) {
          console.error("🚨 [PRISMA_NUCLEAR_SHIELD] Gagal memuat Prisma. Mengaktifkan mode isolasi.");
          target._failed = true;
          target._error = err.message;
        }
      }

      // Jika inisialisasi gagal atau sedang dalam mode isolasi
      if (target._failed || !target._instance) {
        return (...args: any[]) => {
          console.error(`[PRISMA_ISOLATED] Operasi '${prop}' dibatalkan untuk mencegah crash.`);
          return Promise.reject(new Error("Prisma Engine Offline. Gunakan jalur MySQL murni."));
        };
      }

      // Teruskan ke instance asli
      const value = target._instance[prop];
      if (typeof value === 'function') {
        return value.bind(target._instance);
      }
      return value;
    }
  });
}

export const prisma = globalForPrisma.prisma || createNuclearSafePrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;