import { NextResponse } from 'next/server'
import { seedDatabase } from '../../../../../prisma/seed'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const maintenanceToken = process.env.MAINTENANCE_TOKEN

    // 1. Validasi Token Keamanan
    if (!maintenanceToken || !token || token !== maintenanceToken) {
      console.warn('⚠️ Unauthorized DB Setup attempt detected.');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Invalid or missing maintenance token.' 
      }, { status: 401 })
    }

    console.log('🚀 Web-Based Database Setup triggered...');

    // 2. Jalankan Seeder
    await seedDatabase()

    return NextResponse.json({ 
      status: 'success',
      message: 'Database setup & seeding completed successfully.',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[DATABASE_SETUP_ERROR]', error)
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to setup database', 
      details: error.message 
    }, { status: 500 })
  }
}
