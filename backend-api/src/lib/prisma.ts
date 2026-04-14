import { PrismaClient } from '@prisma/client'

// Mencegah error "Too many connections" saat development (Hot Reload)
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Self-healing: Jika model baru (footerLink) belum terdaftar di instance lama, buat instance baru
export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma