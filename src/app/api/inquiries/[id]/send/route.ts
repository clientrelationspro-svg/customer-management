import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// POST: 发送回复邮件
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jsonBody = await request.json();
    const { subject, body: emailBody } = jsonBody;

    if (!subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json({ error: '主题和内容不能为空' }, { status: 400 });
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
    if (!inquiry) return NextResponse.json({ error: '询价不存在' }, { status: 404 });

    const config = await prisma.emailConfig.findFirst({ where: { isActive: true } });
    if (!config) return NextResponse.json({ error: '邮件配置未找到' }, { status: 400 });

    // 发送邮件
    const replyMessageId = await sendReplyEmail(
      { host: config.smtpHost, port: config.smtpPort, user: config.smtpUser, password: config.smtpPass, fromName: config.fromName },
      inquiry.fromEmail,
      inquiry.messageId || '',
      subject,
      emailBody
    );

    // 记录回复
    await prisma.inquiryReply.create({
      data: { inquiryId: params.id, subject, body: emailBody },
    });

    // 更新询价状态
    await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        status: 'replied',
        finalSubject: subject,
        finalBody: emailBody,
        repliedAt: new Date(),
        replyMessageId,
      },
    });

    return NextResponse.json({ success: true, message: '回复已发送' });
  } catch (error: any) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: error.message || '发送失败' }, { status: 500 });
  }
}
