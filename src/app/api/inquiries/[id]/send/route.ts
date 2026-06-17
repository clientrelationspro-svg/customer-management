import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// POST: 发送回复邮件
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jsonBody = await request.json();
    const { subject, body: emailBody, attachments } = jsonBody;

    if (!subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json({ error: '主题和内容不能为空' }, { status: 400 });
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
    if (!inquiry) return NextResponse.json({ error: '询价不存在' }, { status: 404 });

    const config = await prisma.emailConfig.findFirst({ where: { isActive: true } });
    if (!config) return NextResponse.json({ error: '邮件配置未找到' }, { status: 400 });

    // 发送邮件
    // 构建附件路径
    const mailAttachments = (attachments || []).map((a: any) => ({
      filename: a.filename,
      path: a.path?.startsWith('/') ? `public${a.path}` : a.path,
    }));

    const replyMessageId = await sendReplyEmail(
      { host: config.smtpHost, port: config.smtpPort, user: config.smtpUser, password: config.smtpPass, fromName: config.fromName },
      inquiry.fromEmail,
      inquiry.messageId || '',
      subject,
      emailBody,
      mailAttachments.length > 0 ? mailAttachments : undefined
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

    // 更新客户跟进记录
    if (inquiry.customerId) {
      const now = new Date();
      await prisma.followUp.create({
        data: {
          customerId: inquiry.customerId,
          contactMethod: 'email',
          followUpMatters: '开发',
          nextAction: `已回复: ${subject.slice(0, 100)}`,
          priority: 'high',
          status: 'in_progress',
          lastFollowUpDate: now,
          nextFollowUpDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 默认7天后跟进
        },
      });
    }

    return NextResponse.json({ success: true, message: '回复已发送' });
  } catch (error: any) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: error.message || '发送失败' }, { status: 500 });
  }
}
