import { NextResponse, NextRequest } from 'next/server';
import { isAuthorized } from '@/lib/security';

export function middleware(request: NextRequest) {
  // 📝 LOG AKTIVITAS API
  console.log(`[API_REQUEST] ${request.method} ${request.nextUrl.pathname}`);

  const { pathname } = request.nextUrl;

  // 1. SKIP UNTUK STATIC ASSETS & INTERNAL NEXT.js
  if (
      pathname.startsWith('/_next') || 
      pathname.startsWith('/static') || 
      pathname.includes('.') || // File dengan ekstensi (jpg, png, js, css)
      pathname === '/favicon.ico'
  ) {
      return NextResponse.next();
  }

  // Ambil origin dan host
  const origin = request.headers.get('origin') || '';
  const host = request.headers.get('host') || '';
  
  // Siapkan response
  const response = NextResponse.next();

  // 🛡️ SECURITY CHECK: Validasi Host (Backend) & Origin (Frontend)
  // Menangani pemisahan domain Backend dan Frontend secara aman
  let originHost = '';
  try {
    if (origin) {
      originHost = new URL(origin).host;
    }
  } catch (e) {
    console.log(`[SECURITY_WARN] Malformed Origin: ${origin}`);
  }
  
  // Jika ada origin, wajib validasi
  if (origin && !isAuthorized(originHost)) {
     console.log(`[SECURITY_ALERT] Blocked Unauthorized Origin: ${origin}`);
     return new NextResponse(JSON.stringify({ error: 'Unauthorized Origin' }), {
       status: 403,
       headers: { 'Content-Type': 'application/json' }
     });
  }

  // Jika aman, set header CORS
  if (origin) {
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
