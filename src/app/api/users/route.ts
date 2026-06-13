import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getTokenPayload, requireAdmin } from '@/lib/auth';

async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_info TEXT`);
  } catch {}
}

export async function GET() {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!requireAdmin(payload)) {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, description: true, company: true, contact: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!requireAdmin(payload)) {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const { email, name, password, role, description, company, contact } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ success: false, error: '邮箱和密码为必填' }, { status: 400 });
    }
    if (!['admin', 'user'].includes(role || 'user')) {
      return NextResponse.json({ success: false, error: '角色无效' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ success: false, error: '该邮箱已存在' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: role || 'user',
        description: description || null,
        company: company || null,
        contact: contact || null,
      },
      select: { id: true, email: true, name: true, role: true, description: true, company: true, contact: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: '创建用户失败' }, { status: 500 });
  }
}
