import { NextResponse } from 'next/server'
import pool, { queryOne, query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function generateMockData(report: string[]) {
  const users: any = await query('SELECT id, departmentId FROM User');
  if (users.length === 0) return;

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-12-31');

  // 1. Audit Logs (50 records)
  const actions = ['CREATE_LINK', 'UPDATE_LINK', 'DELETE_LINK', 'LOGIN', 'LOGOUT', 'EXPORT_DATA'];
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const date = getRandomDate(startDate, endDate);
    
    await pool.execute(`
      INSERT INTO AuditLog (action, resource, details, userId, departmentId, ipAddress, userAgent, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      action, 'System', `Mock activity ${i+1}`, user.id, user.departmentId, 
      '127.0.0.1', 'Mozilla/5.0 (Mock)', date
    ]);
  }
  report.push('✅ 50 Mock AuditLogs generated (2025-2026)');

  // 2. Click Logs (50 records)
  // Ensure we have at least one link to click
  let links: any = await query('SELECT id FROM Link LIMIT 5');
  if (links.length === 0) {
    const dept = await queryOne('SELECT id FROM Category LIMIT 1');
    await pool.execute(`
      INSERT INTO Link (title, url, slug, category_id, userId, is_active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, ['Example Link', 'https://google.com', 'example-link', dept?.id || 1, users[0].id, 1]);
    links = await query('SELECT id FROM Link LIMIT 1');
  }

  const roles = ['GUEST', 'EMPLOYEE', 'ADMIN'];
  for (let i = 0; i < 50; i++) {
    const link = links[Math.floor(Math.random() * links.length)];
    const date = getRandomDate(startDate, endDate);
    const role = roles[Math.floor(Math.random() * roles.length)];

    await pool.execute(`
      INSERT INTO ClickLog (linkId, ipAddress, userAgent, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [link.id, '192.168.1.1', 'Mozilla/5.0 (Mock)', role, date]);
  }
  report.push('✅ 50 Mock ClickLogs generated (2025-2026)');
}

async function seedDatabase(isMock: boolean = false) {
  const report: string[] = [];
  report.push('--- NATIVE MYSQL HARDENING & SEEDING START ---');
  
  // 0. SCHEMA HARDENING (Ensure columns exist for native migration)
  const columnsToAdd = [
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN is_active TINYINT(1) DEFAULT 1' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN fullName VARCHAR(255)' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN departmentId INT' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN sessionId VARCHAR(191)' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN email VARCHAR(191)' },
    { table: 'User', sql: 'ALTER TABLE User ADD COLUMN image_url VARCHAR(191)' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN ipAddress VARCHAR(45)' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN resourceId VARCHAR(255)' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN userAgent TEXT' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN departmentId INT' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'AuditLog', sql: 'ALTER TABLE AuditLog ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'Category', sql: 'ALTER TABLE Category ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'Category', sql: 'ALTER TABLE Category ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'Link', sql: 'ALTER TABLE Link ADD COLUMN is_active TINYINT(1) DEFAULT 1' },
    { table: 'Link', sql: 'ALTER TABLE Link ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'Link', sql: 'ALTER TABLE Link ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'ClickLog', sql: 'ALTER TABLE ClickLog ADD COLUMN role VARCHAR(50)' },
    { table: 'ClickLog', sql: 'ALTER TABLE ClickLog ADD COLUMN userAgent TEXT' },
    { table: 'ClickLog', sql: 'ALTER TABLE ClickLog ADD COLUMN ipAddress VARCHAR(45)' },
    { table: 'EventClickLog', sql: 'ALTER TABLE EventClickLog ADD COLUMN userAgent TEXT' },
    { table: 'EventClickLog', sql: 'ALTER TABLE EventClickLog ADD COLUMN ipAddress VARCHAR(45)' },
    { table: 'Notification', sql: 'ALTER TABLE Notification CHANGE COLUMN relatedId feedbackId INT' }
  ];

  for (const item of columnsToAdd) {
    try {
      await pool.execute(item.sql);
      report.push(`✅ Column added/verified in ${item.table}`);
    } catch (e) {
      // Ignore "Duplicate column name" error
    }
  }
  report.push('✅ Schema Hardening completed.');

  // 1. Hardening: Add Indexes
  const indexes = [
    { name: 'idx_department', col: 'departmentId', table: 'User' },
    { name: 'idx_username', col: 'username', table: 'User' },
    { name: 'idx_role', col: 'role', table: 'User' }
  ];

  for (const idx of indexes) {
    try {
      await pool.execute(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} (${idx.col})`);
      report.push(`✅ Index ${idx.name} added to ${idx.table}`);
    } catch (e) {
      report.push(`ℹ️ Index ${idx.name} already exists or skipped.`);
    }
  }

  // 1. Seed Categories (Actual Vocational List)
  const defaultCategories = [
    { name: 'Bagian Tata Usaha', en: 'Administrative Division' },
    { name: 'Pelatihan dan Sertifikasi', en: 'Training and Certification' },
    { name: 'Pengembangan dan Pemasaran', en: 'Development and Marketing' },
    { name: 'Kejuruan TIK', en: 'ICT Vocational' },
    { name: 'Kejuruan Tekmek', en: 'Mechanical Technology Vocational' },
    { name: 'Kejuruan Bisman', en: 'Business and Management Vocational' },
    { name: 'Kejuruan Elektro', en: 'Electronics Vocational' },
    { name: 'Kejuruan Otomotif', en: 'Automotive Vocational' },
    { name: 'Kejuruan Refrigerasi', en: 'Refrigeration Vocational' },
    { name: 'Kejuruan Fashion Teknologi', en: 'Fashion Technology Vocational' },
    { name: 'Kejuruan Tata Rias', en: 'Cosmetology Vocational' },
    { name: 'Kejuruan Listrik', en: 'Electrical Vocational' },
    { name: 'Umum', en: 'General' }
  ];

  for (const cat of defaultCategories) {
    const existing = await queryOne('SELECT id FROM Category WHERE name = ?', [cat.name]);
    if (!existing) {
      await pool.execute('INSERT INTO Category (name, name_en, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [cat.name, cat.en]);
      report.push(`✅ Category "${cat.name}" created.`);
    } else {
      report.push(`ℹ️ Category "${cat.name}" already exists.`);
    }
  }

  // 2. Seed/Upsert Super Admin
  try {
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    await pool.execute(`
      INSERT INTO User (username, password, fullName, role, is_active, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        password = VALUES(password),
        fullName = IF(fullName IS NULL OR fullName = '', VALUES(fullName), fullName),
        role = 'ADMIN',
        is_active = 1,
        updatedAt = NOW()
    `, ['admin', hashedAdmin, 'Super Admin', 'ADMIN', 1]);
    report.push('✅ Super Admin "admin" ensured (Password: admin123)');

    // 2.1 Seed Admin Event (Global/Pusat - Tidak Terikat Kategori)
    const hashedEvent = await bcrypt.hash('password123', 10);
    await pool.execute(`
      INSERT INTO User (username, password, fullName, role, departmentId, is_active, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1, departmentId = NULL, updatedAt = NOW()
    `, ['adminevent', hashedEvent, 'Admin Event Global', 'ADMIN_EVENT', null, 1]);
    report.push('✅ Admin Event "adminevent" ensured (Password: password123, Dept: Global)');

    // 2.2 Seed Pegawai (Contoh di Tata Usaha)
    const tuDept = await queryOne('SELECT id FROM Category WHERE name = ?', ['Bagian Tata Usaha']);
    const hashedPegawai = await bcrypt.hash('password123', 10);
    await pool.execute(`
      INSERT INTO User (username, password, fullName, role, departmentId, is_active, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1, updatedAt = NOW()
    `, ['pegawai', hashedPegawai, 'Pegawai Tata Usaha', 'EMPLOYEE', tuDept?.id || null, 1]);
    report.push('✅ User Pegawai "pegawai" ensured (Password: password123, Dept: Tata Usaha)');

  } catch (err: any) {
    report.push(`❌ Failed to seed Users: ${err.message}`);
  }

  // 3. Generate Mock Data (OPTIONAL - only if isMock=true)
  if (isMock) {
    report.push('--- GENERATING MOCK DATA ---');
    try {
      await generateMockData(report);
    } catch (err: any) {
      report.push(`❌ Failed to generate Mock Data: ${err.message}`);
    }
  } else {
    report.push('ℹ️ Skipping Mock data generation (Production Mode)');
  }

  report.push('--- NATIVE MYSQL SEEDING COMPLETE ---');
  return report;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const maintenanceToken = process.env.MAINTENANCE_TOKEN

    // 1. Validasi Token Keamanan
    if (!maintenanceToken || !token || token !== maintenanceToken) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Invalid or missing maintenance token.' 
      }, { status: 401 })
    }

    // 2. Jalankan Seeder Original MySQL
    const isMock = searchParams.get('is_mock') === 'true'
    const report = await seedDatabase(isMock)

    return NextResponse.json({ 
      status: 'success',
      build_engine: 'SIGAP-MYSQL-NATIVE-V1.1-CLEAN-SLATE',
      message: 'Database initialization completed.',
      report: report,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[DATABASE_SETUP_ERROR]', error)
    return NextResponse.json({ 
      status: 'error',
      build_engine: 'SIGAP-MYSQL-NATIVE-V1.0',
      message: 'Failed to setup database: ' + (error.message || 'Unknown Error'),
      details: error.stack || ''
    }, { status: 500 })
  }
}

