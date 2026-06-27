import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: 获取当前用户的邮件配置
export async function GET() {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const configs = await prisma.emailConfig.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: configs });
  } catch (e: any) {
    console.error('email-config GET error:', e?.message || e);
    return NextResponse.json({ success: false, error: '获取配置失败: ' + (e?.message || '未知错误') }, { status: 500 });
  }
}

// POST: 创建邮件配置（绑定当前用户）
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, smtpUser, smtpPass, fromName } = body;

    if (!imapHost || !imapUser || !imapPass || !smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    // 设为活跃时，将同一用户的其他配置设为非活跃
    if (body.isActive !== false) {
      await prisma.emailConfig.updateMany({ where: { userId: payload.userId }, data: { isActive: false } });
    }

    const config = await prisma.emailConfig.create({
      data: {
        userId: payload.userId,
        imapHost, imapPort: parseInt(imapPort) || 993, imapUser, imapPass,
        smtpHost, smtpPort: parseInt(smtpPort) || 465, smtpUser, smtpPass,
        fromName: fromName || imapUser,
      },
    });

    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch (e: any) {
    console.error('email-config POST error:', e?.message || e);
    return NextResponse.json({ success: false, error: '创建配置失败: ' + (e?.message || '未知错误') }, { status: 500 });
  }
}
