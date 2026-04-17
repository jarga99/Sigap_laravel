import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import os from 'os';

export async function GET() {
    try {
        const info: any = {
            os: {
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
                arch: os.arch(),
            },
            node: {
                version: process.version,
                env: process.env.NODE_ENV,
            },
            database: {
                type: 'Native MySQL (mysql2)',
                status: 'Clean'
            }
        };

        // Cek OpenSSL via CLI jika diizinkan
        try {
            info.openssl = execSync('openssl version').toString().trim();
        } catch (e) {
            info.openssl = "N/A (Exec not allowed)";
        }

        return NextResponse.json(info);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
