import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Security Check
    if (!token || token !== process.env.MAINTENANCE_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
        return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    let connection;
    try {
        // Parse DATABASE_URL manually for mysql2
        // mysql://user:pass@host:port/db
        const dbUrl = process.env.DATABASE_URL;
        const connection = await mysql.createConnection(dbUrl);

        console.log("Successfully connected to database via mysql2");

        // 1. Create Tables
        const queries = [
            `CREATE TABLE IF NOT EXISTS User (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(191) UNIQUE NOT NULL,
                password VARCHAR(191) NOT NULL,
                email VARCHAR(191) UNIQUE,
                fullName VARCHAR(191) DEFAULT '-',
                role ENUM('ADMIN', 'ADMIN_EVENT', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
                image_url VARCHAR(191),
                createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3),
                departmentId INT,
                sessionId VARCHAR(191)
            )`,

            `CREATE TABLE IF NOT EXISTS Settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instansi_name VARCHAR(191) NOT NULL,
                instansi_name_en VARCHAR(191),
                instansi_desc TEXT,
                instansi_desc_en TEXT,
                logo_url VARCHAR(191),
                bg_url VARCHAR(191),
                custom_domain VARCHAR(191),
                updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                app_name VARCHAR(191) DEFAULT 'SIGAP',
                contact_address TEXT,
                contact_email VARCHAR(191),
                contact_phone VARCHAR(191),
                footer_copyright VARCHAR(191) DEFAULT '© 2026 Admin Portal',
                footer_text TEXT,
                footer_text_en TEXT,
                footer_mode VARCHAR(191) DEFAULT 'COMPLEX'
            )`,

            `CREATE TABLE IF NOT EXISTS Category (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(191) NOT NULL,
                name_en VARCHAR(191),
                icon VARCHAR(191),
                createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )`,

            `CREATE TABLE IF NOT EXISTS \`Event\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(191) UNIQUE NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT,
                status ENUM('AKTIF', 'TIDAK_AKTIF', 'ARSIP') DEFAULT 'TIDAK_AKTIF',
                bgType VARCHAR(191) DEFAULT 'color',
                bgValue VARCHAR(191) DEFAULT '#0f172a',
                profilePhoto VARCHAR(191),
                profileShape VARCHAR(191) DEFAULT 'circle',
                profileBorderStyle VARCHAR(191) DEFAULT 'none',
                profileBorderWidth INT DEFAULT 2,
                profileBgColor VARCHAR(191) DEFAULT '#ffffff',
                showProfile BOOLEAN DEFAULT TRUE,
                showCover BOOLEAN DEFAULT TRUE,
                showTitle BOOLEAN DEFAULT TRUE,
                showDescription BOOLEAN DEFAULT TRUE,
                showFooter BOOLEAN DEFAULT TRUE,
                showSystemBranding BOOLEAN DEFAULT TRUE,
                customBranding VARCHAR(191) DEFAULT 'SIGAP PROJECT',
                customPoweredBy VARCHAR(191) DEFAULT 'Advanced Event Engine',
                eventPhoto VARCHAR(191),
                footerText TEXT,
                profileWidth INT DEFAULT 80,
                profileHeight INT DEFAULT 80,
                coverHeight INT DEFAULT 128,
                titleColor VARCHAR(191) DEFAULT '#ffffff',
                titleFont VARCHAR(191) DEFAULT 'Inter',
                descColor VARCHAR(191) DEFAULT '#ffffff',
                descFont VARCHAR(191) DEFAULT 'Inter',
                footerColor VARCHAR(191) DEFAULT '#ffffff',
                footerFont VARCHAR(191) DEFAULT 'Inter',
                buttonShape VARCHAR(191) DEFAULT 'rounded',
                buttonRadius INT DEFAULT 12,
                createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3),
                userId INT NOT NULL
            )`,

            `CREATE TABLE IF NOT EXISTS FooterLink (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(191) NOT NULL,
                url TEXT NOT NULL,
                type VARCHAR(191) DEFAULT 'TEXT',
                logoUrl VARCHAR(191),
                \`order\` INT DEFAULT 0,
                isActive BOOLEAN DEFAULT TRUE,
                createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )`
        ];

        for (const query of queries) {
            await connection.execute(query);
        }

        // 2. Insert Default Data
        const hashedPassword = await bcrypt.hash('sigap2025', 10);

        // Check if admin exists
        const [users] = await connection.execute('SELECT id FROM User WHERE username = ?', ['sigap_admin']);
        if ((users as any[]).length === 0) {
            await connection.execute(
                'INSERT INTO User (username, password, fullName, role) VALUES (?, ?, ?, ?)',
                ['sigap_admin', hashedPassword, 'Super Admin SIGAP', 'ADMIN']
            );
        }

        // Check if settings exists
        const [settings] = await connection.execute('SELECT id FROM Settings WHERE id = 1');
        if ((settings as any[]).length === 0) {
            await connection.execute(
                'INSERT INTO Settings (id, instansi_name, app_name) VALUES (?, ?, ?)',
                [1, 'Instansi Pemerintah', 'SIGAP']
            );
        }

        await connection.end();

        return NextResponse.json({
            status: 'success',
            message: 'Database initialized and seeded via Raw SQL Bridge successfully.',
            note: 'You can now login with sigap_admin / sigap2025'
        });

    } catch (error: any) {
        console.error("Raw Setup Error:", error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
