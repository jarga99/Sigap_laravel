import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    // 1. Database Dump
    const dbUrl = new URL(process.env.DATABASE_URL!);
    const dbName = dbUrl.pathname.replace('/', '');
    const dumpCmd = `mysqldump -h ${dbUrl.hostname} -P ${dbUrl.port || '3306'} -u ${dbUrl.username} -p"${dbUrl.password}" ${dbName} --no-tablespaces > "${tempSqlPath}"`;
    await execPromise(dumpCmd);

    // 2. Compress both SQL and Uploads
    // -C process.cwd() changes to the root of the search
    // We include public/uploads and the temp SQL file
    const tarCmd = `tar -czf "${finalBackupPath}" -C "${process.cwd()}" public/uploads -C "${backupDir}" "${path.basename(tempSqlPath)}"`;
    await execPromise(tarCmd);

    // 3. Cleanup temp SQL
    if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);

    return finalBackupPath;
  } catch (error) {
    console.error('Backup creation failed during reset:', error);
    // Cleanup if partially failed
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

    // 1. Bersihkan seluruh Data Operasional dengan Transaksi
    await prisma.$transaction([
      prisma.eventClickLog.deleteMany(),
      prisma.eventItem.deleteMany(),
      prisma.event.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.clickLog.deleteMany(),
      prisma.link.deleteMany(),
      prisma.category.deleteMany(),
      prisma.footerLink.deleteMany(),
      prisma.feedback.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.settings.deleteMany()
    ]);

    // 2. Hapus semua user kecuali sigap_admin
    await prisma.user.deleteMany({
      where: {
        username: { not: 'sigap_admin' }
      }
    });

    // 3. Bersihkan fisik folder Uploads secara rekursif
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(uploadDir)) {
        // Hapus folder dan isinya
        fs.rmSync(uploadDir, { recursive: true, force: true });
        // Buat kembali folder kosong
        fs.mkdirSync(uploadDir, { recursive: true });
        // Tambahkan .gitkeep jika perlu (opsional, tapi bagus untuk git)
        fs.writeFileSync(path.join(uploadDir, '.gitkeep'), '');
      }
    } catch (fsError) {
      console.error('Peringatan: Gagal menghapus isi folder uploads secara penuh:', fsError);
    }

    // 4. 📝 Record Audit Log
    await recordAuditLog({
      userId: session.userId,
      action: 'RESET_SYSTEM',
      resource: 'System',
      details: { 
        timestamp: new Date().toISOString(),
        backup_saved_as: path.basename(backupPath)
      },
      ip: request.headers.get('x-forwarded-for')
    })

    return NextResponse.json({ 
      message: 'Sistem berhasil di-reset. Data telah dikosongkan dan backup keamanan telah disimpan di server.',
      backup: path.basename(backupPath)
    })

  } catch (error) {
    console.error('Reset Error:', error)
    return NextResponse.json({ message: 'Terjadi kesalahan sistem saat mereset data.' }, { status: 500 })
  }
}
