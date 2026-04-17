import { NextResponse } from 'next/server';

/**
 * 🩺 MINIMAL HEALTH CHECK
 * Jalur darurat tanpa database untuk mengetes apakah Next.js 15 Standalone 
 * sudah jalan sempurna di server Staging.
 */
export async function GET() {
    return NextResponse.json({
        status: "SIGAP-READY",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        diagnosis_info: {
            cwd: process.cwd(),
            platform: process.platform,
            node_version: process.version
        }
    });
}
