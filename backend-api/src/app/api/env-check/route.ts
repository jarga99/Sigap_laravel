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
            prisma_info: {
                binaryTargets: ["native", "debian-openssl-1.1.x", "rhel-openssl-1.1.x"],
            }
        };

        // Cek OpenSSL via CLI jika diizinkan
        try {
            info.openssl = execSync('openssl version').toString().trim();
        } catch (e) {
            info.openssl = "N/A (Exec not allowed)";
        }

        // Cek lokasi file engine (Cek keberadaan folder)
        const fs = require('fs');
        const path = require('path');
        const enginePath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
        
        if (fs.existsSync(enginePath)) {
            info.prisma_engines = fs.readdirSync(enginePath).filter((f: string) => f.includes('engine'));
        } else {
            info.prisma_engines = "Folder not found: " + enginePath;
        }

        return NextResponse.json(info);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
