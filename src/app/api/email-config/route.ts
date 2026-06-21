// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

function getUserIdFromCookie() {
  try {
    const token = require('next/headers').cookies().get('auth_token')?.value;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || null;
  } catch { return null; }
}

// GET: 获取当前用户的邮件配置
export async function GET() {
  try {
    const userId = getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const configs = await prisma.emailConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: configs });
  } catch {
    return NextResponse.json({ success: false, error: '获取配置失败' }, { status: 500 });
  }
}

// POST: 创建邮件配置（绑定当前用户）
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, smtpUser, smtpPass, fromName } = body;

    if (!imapHost || !imapUser || !imapPass || !smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    // 设为活跃时，将同一用户的其他配置设为非活跃
    if (body.isActive !== false) {
      await prisma.emailConfig.updateMany({ where: { userId }, data: { isActive: false } });
    }

    const config = await prisma.emailConfig.create({
      data: {
        userId,
        imapHost, imapPort: parseInt(imapPort) || 993, imapUser, imapPass,
        smtpHost, smtpPort: parseInt(smtpPort) || 465, smtpUser, smtpPass,
        fromName: fromName || imapUser,
      },
    });

    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: '创建配置失败' }, { status: 500 });
  }
}
