import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, customerId } = body;
    if (!to || !subject || !emailBody) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });

    const config = await prisma.emailConfig.findFirst({ where: { isActive: true } });
    if (!config) return NextResponse.json({ error: '邮件配置未设置' }, { status: 400 });

    await sendReplyEmail(
      { host: config.smtpHost, port: config.smtpPort, user: config.smtpUser, password: config.smtpPass, fromName: config.fromName },
      to, '', subject, emailBody
    );

    // 创建跟进记录
    if (customerId) {
      await prisma.followUp.create({
        data: {
          customerId, contactMethod: 'email', followUpMatters: '开发',
          nextAction: `已发送: ${subject.slice(0, 100)}`, priority: 'high', status: 'in_progress',
          lastFollowUpDate: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '发送失败' }, { status: 500 });
  }
}
