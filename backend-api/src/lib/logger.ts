import pool from './db'

export async function recordAuditLog(data: {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | number;
  details?: any;
  departmentId?: number | null;
  ipAddress?: string | null;
}) {
  try {
    await pool.execute(
      'INSERT INTO AuditLog (userId, action, resource, resourceId, details, departmentId, ipAddress) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        Number(data.userId),
        data.action,
        data.resource,
        data.resourceId ? String(data.resourceId) : null,
        data.details ? JSON.stringify(data.details) : null,
        data.departmentId ? Number(data.departmentId) : null,
        data.ipAddress || null
      ]
    );
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR]', error)
  }
}
