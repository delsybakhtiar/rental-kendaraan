import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Middleware
 * Adds security headers and cookie configuration
 */

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // ============================================
  // Security Headers
  // ============================================
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()'
  );

  // Content Security Policy (relaxed for development)
  const isDev = process.env.NODE_ENV === 'development';
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: http://localhost:3003",
    "frame-ancestors 'self'",
    isDev ? "" : "upgrade-insecure-requests",
  ].filter(Boolean).join('; ');
  
  response.headers.set('Content-Security-Policy', cspDirectives);

  // HSTS (only in production with HTTPS)
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // ============================================
  // Cookie Security Configuration
  // ============================================
  // Note: For session cookies, use these flags:
  // - Secure: Only sent over HTTPS
  // - HttpOnly: Not accessible via JavaScript
  // - SameSite: 'Strict' or 'Lax' to prevent CSRF
  
  // Example of setting a secure cookie (if needed):
  // response.cookies.set('session', token, {
  //   httpOnly: true,
  //   secure: !isDev,
  //   sameSite: 'strict',
  //   path: '/',
  //   maxAge: 60 * 60 * 24, // 24 hours
  // });

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
