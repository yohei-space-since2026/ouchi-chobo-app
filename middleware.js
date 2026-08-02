import { NextResponse } from 'next/server';
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from './lib/session';

// Web Crypto API (crypto.subtle) を使っているため Edge Runtime のままで動く
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

const PUBLIC_PATHS = ['/login', '/api/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}
