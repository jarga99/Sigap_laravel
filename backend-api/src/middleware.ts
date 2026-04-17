import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 📝 LOG AKTIVITAS API
  console.log(`[API_REQUEST] ${request.method} ${request.nextUrl.pathname}`);

  // Ambil origin dari request (misal: https://sigapv1.uptblkpasuruan.com)
  const origin = request.headers.get('origin');
  
  // Siapkan response
  const response = NextResponse.next();

  // Jika ada origin (berarti request dari browser/frontend)
  if (origin) {
    // Sederhana: Kita izinkan origin tersebut
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Set header CORS standar
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Handle preflight request (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

// Hanya jalankan middleware ini untuk folder /api
export const config = {
  matcher: '/api/:path*',
};
