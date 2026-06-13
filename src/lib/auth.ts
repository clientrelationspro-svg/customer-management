import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const AUTH_COOKIE = 'auth_token';
const TOKEN_PREFIX = 'cm_';

// 简单的token生成
function generateToken(userId: string, role: string): string {
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return TOKEN_PREFIX + btoa(payload);
}

function parseToken(token: string): { userId: string; role: string; exp: number } | null {
  try {
    if (!token.startsWith(TOKEN_PREFIX)) return null;
    const payload = JSON.parse(atob(token.slice(TOKEN_PREFIX.length)));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// 设置登录cookie
export function setAuthCookie(userId: string, role: string) {
  const token = generateToken(userId, role);
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24小时
    path: '/',
  });
}

// 清除登录cookie
export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(AUTH_COOKIE);
}

// 获取当前用户（从cookie）
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    
    const payload = parseToken(token);
    if (!payload) return null;
    
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    return user;
  } catch {
    return null;
  }
}

// 获取当前用户（异步，用于API routes）
export function getTokenPayload() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    return parseToken(token);
  } catch {
    return null;
  }
}

// 验证管理员身份
export function requireAdmin(payload: { userId: string; role: string } | null): boolean {
  return payload?.role === 'admin';
}
