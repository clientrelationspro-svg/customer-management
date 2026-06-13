import { NextRequest, NextResponse } from 'next/server';

const TOKEN_PREFIX = 'cm_';
const AUTH_COOKIE = 'auth_token';
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

function hasValidToken(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !token.startsWith(TOKEN_PREFIX)) return false;

  try {
    const payload = JSON.parse(atob(token.slice(TOKEN_PREFIX.length)));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源和内部请求
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // 公开路径
  if (isPublicPath(pathname)) {
    if (pathname === '/login' && hasValidToken(request)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 需要登录
  if (!hasValidToken(request)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
