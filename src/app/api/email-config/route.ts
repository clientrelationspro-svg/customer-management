import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取邮件配置
export async function GET() {
  try {
    const configs = await prisma.emailConfig.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取配置失败' }, { status: 500 });
  }
}

// POST: 创建邮件配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, smtpUser, smtpPass, fromName } = body;

    if (!imapHost || !imapUser || !imapPass || !smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    // 如果设为活跃，先将其他配置设为非活跃
    if (body.isActive !== false) {
      await prisma.emailConfig.updateMany({ data: { isActive: false } });
    }

    const config = await prisma.emailConfig.create({
      data: {
        imapHost, imapPort: parseInt(imapPort) || 993, imapUser, imapPass,
        smtpHost, smtpPort: parseInt(smtpPort) || 465, smtpUser, smtpPass,
        fromName: fromName || imapUser,
      },
    });

    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: '创建配置失败' }, { status: 500 });
  }
}
