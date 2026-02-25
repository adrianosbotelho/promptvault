import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'promptvault_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow root path to pass through (it will handle redirect client-side)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const isProtectedRoute = pathname.startsWith('/dashboard');

  // Public routes that don't require authentication
  const isPublicRoute = pathname === '/login';

  // Check if route is protected
  if (isProtectedRoute) {
    // Get token from cookie
    const token = request.cookies.get(TOKEN_COOKIE);

    // If no token, redirect to login
    if (!token || !token.value) {
      const loginUrl = new URL('/login', request.url);
      // Save the original URL to redirect back after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is on login page and has token, redirect to dashboard
  // But only if token is valid (not empty)
  if (isPublicRoute && pathname === '/login') {
    const token = request.cookies.get(TOKEN_COOKIE);
    if (token && token.value && token.value.trim() !== '') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
