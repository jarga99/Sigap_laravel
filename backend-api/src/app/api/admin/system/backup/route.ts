import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { recordAuditLog } from '@/lib/logger'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized. Hanya Super Admin yang diizinkan mem-backup sistem.' }, { status: 403 })
    }

    const { DATABASE_URL } = process.env;
    if (!DATABASE_URL) {
      return NextResponse.json({ message: 'Kredensial database tidak ditemukan.' }, { status: 500 })
    }

    // Parse MySQL URL
    // Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
    const dbUrl = new URL(DATABASE_URL);
    const username = dbUrl.username;
    const password = dbUrl.password;
    const host = dbUrl.hostname;
    const port = dbUrl.port || '3306';
    const database = dbUrl.pathname.replace('/', '');

    // Note: Ini mensyaratkan mysqldump terinstall di server backend
    const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${username} -p"${password}" ${database} --no-tablespaces`;

    const { stdout, stderr } = await execPromise(dumpCmd, { maxBuffer: 1024 * 1024 * 50 }); // 50MB Buffer

    // Kadang mysqldump ngirim ke stderr walau berhasil (misal: warning)
    if (stderr && stderr.toLowerCase().includes('error')) {
      console.warn('mysqldump warning/error:', stderr);
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sigap_backup_${dateStr}.sql`;

    // 📝 Record Audit Log
    recordAuditLog({
      userId: session.userId,
      action: 'BACKUP_DATABASE',
      resource: 'System',
      details: { filename },
      ip: request.headers.get('x-forwarded-for')
    })

    return new NextResponse(stdout, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error('Backup Error:', error)
    return NextResponse.json({ message: 'Gagal melakukan backup database.', error: error.message }, { status: 500 })
  }
}
