import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

function getUserIdFromCookie() {
  try {
    const token = require('next/headers').cookies().get('auth_token')?.value;
    if (!token || !token.startsWith('cm_')) return null;
    const payload = JSON.parse(Buffer.from(token.slice(3), 'base64').toString());
    return payload.userId || null;
  } catch { return null; }
}

// POST: 发送/定时发送回复邮件
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jsonBody = await request.json();
    const { subject, body: emailBody, attachments, scheduledAt, followUpEnabled, followUpInterval } = jsonBody;

    if (!subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json({ error: '主题和内容不能为空' }, { status: 400 });
    }

    const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
    if (!inquiry) return NextResponse.json({ error: '邮件不存在' }, { status: 404 });

    const userId = getUserIdFromCookie();
    const config = await prisma.emailConfig.findFirst({
      where: { isActive: true, userId: userId || undefined },
    });
    if (!config) return NextResponse.json({ error: '邮件配置未找到' }, { status: 400 });

    // 定时发送：仅保存草稿和定时时间，不实际发送
    if (scheduledAt) {
      await prisma.inquiry.update({
        where: { id: params.id },
        data: {
          finalSubject: subject,
          finalBody: emailBody,
          scheduledAt: new Date(scheduledAt),
          followUpEnabled: followUpEnabled ?? false,
          followUpInterval: followUpInterval ?? null,
          status: 'reviewed',
        },
      });
      return NextResponse.json({ success: true, message: `已设定于 ${new Date(scheduledAt).toLocaleString('zh-CN')} 发送` });
    }

    // 立即发送
    const mailAttachments = (attachments || []).map((a: any) => ({
      filename: a.filename, path: a.path?.startsWith('/') ? `public${a.path}` : a.path,
    }));

    const replyMessageId = await sendReplyEmail(
      { host: config.smtpHost, port: config.smtpPort, user: config.smtpUser, password: config.smtpPass, fromName: config.fromName },
      inquiry.fromEmail, inquiry.messageId || '', subject, emailBody,
      mailAttachments.length > 0 ? mailAttachments : undefined
    );

    // 记录回复
    await prisma.inquiryReply.create({
      data: { inquiryId: params.id, subject, body: emailBody },
    });

    // 更新状态和跟进
    const now = new Date();
    const updateData: any = {
      status: 'replied', finalSubject: subject, finalBody: emailBody, repliedAt: now, replyMessageId,
      followUpEnabled: followUpEnabled ?? false,
      followUpInterval: followUpInterval ?? null,
    };
    if (followUpEnabled && followUpInterval) {
      updateData.nextFollowUpAt = new Date(now.getTime() + followUpInterval * 24 * 60 * 60 * 1000);
    }

    await prisma.inquiry.update({ where: { id: params.id }, data: updateData });

    // 更新客户跟进记录
    if (inquiry.customerId) {
      await prisma.followUp.create({
        data: {
          customerId: inquiry.customerId, contactMethod: 'email', followUpMatters: '开发',
          nextAction: `已回复: ${subject.slice(0, 100)}`, priority: 'high', status: 'in_progress',
          lastFollowUpDate: now,
          nextFollowUpDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({ success: true, message: '回复已发送' });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || '发送失败' }, { status: 500 });
  }
}
