import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth check for auth verification endpoint to avoid circular dependency
    if (request.nextUrl.pathname === '/api/auth/verify') {
      return NextResponse.next();
    }

    // Skip auth check for Agora token endpoint (admin panel usage)
    if (request.nextUrl.pathname === '/api/agora/token') {
      return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*'
  ],
};
