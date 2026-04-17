import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

async function createFullBackup(session: any, request: Request) {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), '..', 'backups');
  const tempSqlPath = path.join(backupDir, `db_dump_${dateStr}.sql`);
  const finalBackupPath = path.join(backupDir, `sigap_reset_backup_${dateStr}.tar.gz`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // 1. Database Dump via CLI (Environment variables must be correct)
    const dbUrl = new URL(process.env.DATABASE_URL!);
    const dbName = dbUrl.pathname.replace('/', '');
    const dumpCmd = `mysqldump -h ${dbUrl.hostname} -P ${dbUrl.port || '3306'} -u ${dbUrl.username} -p"${dbUrl.password}" ${dbName} --no-tablespaces > "${tempSqlPath}"`;
    await execPromise(dumpCmd);

    // 2. Compress both SQL and Uploads
    const tarCmd = `tar -czf "${finalBackupPath}" -C "${process.cwd()}" public/uploads -C "${backupDir}" "${path.basename(tempSqlPath)}"`;
    await execPromise(tarCmd);

    // 3. Cleanup temp SQL
    if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);

    return finalBackupPath;
  } catch (error) {
    console.error('Backup creation failed during reset:', error);
    if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized. Hanya Super Admin yang diizinkan mereset sistem.' }, { status: 403 })
    }

    // 0. Mandatory Backup
    let backupPath = '';
    try {
      backupPath = await createFullBackup(session, request);
    } catch (backupError: any) {
      return NextResponse.json({ 
        message: 'Reset dibatalkan: Gagal membuat backup keamanan sebelum penghapusan data.',
        error: backupError.message 
      }, { status: 500 });
    }

    // 1. Bersihkan seluruh Data Operasional via MySQL Native Transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Matikan FK checks sementara agar bisa wipe berurutan
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

      const tables = [
        'EventClickLog', 'EventItem', 'Event', 'AuditLog', 
        'ClickLog', 'Link', 'Category', 'FooterLink', 
        'Feedback', 'Notification', 'Settings'
      ];

      for (const table of tables) {
        await conn.execute(`DELETE FROM ${table}`);
        await conn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      }

      // Hapus semua user kecuali sigap_admin & admin (original)
      await conn.execute("DELETE FROM User WHERE username NOT IN ('sigap_admin', 'admin')");
      await conn.execute('ALTER TABLE User AUTO_INCREMENT = 1');

      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    // 2. Bersihkan fisik folder Uploads secara rekursif
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(uploadDir)) {
        fs.rmSync(uploadDir, { recursive: true, force: true });
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, '.gitkeep'), '');
      }
    } catch (fsError) {
      console.error('Peringatan: Gagal menghapus isi folder uploads secara penuh:', fsError);
    }

    // 3. 📝 Record Audit Log via Logger terpusat
    recordAuditLog({
      userId: session.userId,
      action: 'RESET_SYSTEM',
      resource: 'System',
      details: { 
        timestamp: new Date().toISOString(),
        backup_saved_as: path.basename(backupPath)
      },
      ipAddress: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: 'Sistem berhasil di-reset. Data telah dikosongkan dan backup keamanan telah disimpan di server.',
      backup: path.basename(backupPath)
    })

  } catch (error: any) {
    console.error('Reset Error:', error)
    return NextResponse.json({ message: 'Terjadi kesalahan sistem saat mereset data: ' + error.message }, { status: 500 })
  }
}
