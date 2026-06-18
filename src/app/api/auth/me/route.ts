import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 确保表结构同步
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT`);
  } catch (e) { /* skip */ }
}

export async function GET() {
  await ensureSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessRole: user.businessRole || 'supplier',
      description: user.description,
    },
  });
}
