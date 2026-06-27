import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, customerId, followUpId, config: testConfig } = body;
    if (!to || !subject || !emailBody) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });

    let smtpConfig;
    if (testConfig && testConfig.host && testConfig.user && testConfig.pass) {
      smtpConfig = {
        host: testConfig.host,
        port: testConfig.port || 465,
        user: testConfig.user,
        password: testConfig.pass,
        fromName: testConfig.fromName || testConfig.user,
      };
    } else {
      const payload = getTokenPayload();
      if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

      const config = await prisma.emailConfig.findFirst({
        where: { isActive: true, userId: payload.userId },
      });
      if (!config) return NextResponse.json({ error: '邮件配置未设置，请先在设置页面添加邮箱' }, { status: 400 });

      smtpConfig = {
        host: config.smtpHost,
        port: config.smtpPort,
        user: config.smtpUser,
        password: config.smtpPass,
        fromName: config.fromName,
      };
    }

    await sendReplyEmail(smtpConfig, to, '', subject, emailBody);

    const sentAt = new Date();

    // 保存发送记录
    if (customerId) {
      const plainText = emailBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const summary = plainText.slice(0, 200);

      if (followUpId) {
        // 更新已有跟进记录，不新建
        await prisma.followUp.update({
          where: { id: followUpId },
          data: {
            lastFollowUpDate: sentAt,
            contactMethod: '邮件',
            stage: '邮件沟通',
            remarks: `【${subject}】\n收件人: ${to}\n\n${summary}${plainText.length > 200 ? '...' : ''}`,
          },
        });
      } else {
        // 没有关联跟进记录时新建
        await prisma.followUp.create({
          data: {
            customerId,
            contactMethod: '邮件',
            followUpMatters: '邮件沟通',
            nextAction: `已发送: ${subject}`,
            priority: 'medium',
            status: 'in_progress',
            lastFollowUpDate: sentAt,
            remarks: `【${subject}】\n收件人: ${to}\n\n${summary}${plainText.length > 200 ? '...' : ''}`,
            stage: '邮件沟通',
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('email-send error:', e?.message || e);
    return NextResponse.json({ error: e.message || '发送失败' }, { status: 500 });
  }
}
