import { prisma } from './prisma'

export async function recordAuditLog(data: {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | number;
  details?: any;
  departmentId?: number | null;
  ip?: string | null;
}) {
  try {
    // Jalankan di background (fire and forget) atau pastikan tidak memblokir respon utama.
    // Di Next.js API Routes, kita biasanya menunggu sebentar tapi tidak masalah jika gagal.
    await prisma.auditLog.create({
      data: {
        userId: Number(data.userId),
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId ? String(data.resourceId) : null,
        details: data.details ? JSON.stringify(data.details) : null,
        departmentId: data.departmentId ? Number(data.departmentId) : null,
        ipAddress: data.ip || null,
      }
    })
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR]', error)
    // Jangan hentikan proses utama jika logging gagal
  }
}
