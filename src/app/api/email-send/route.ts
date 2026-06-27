import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, customerId, config: testConfig } = body;
    if (!to || !subject || !emailBody) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });

    let smtpConfig;
    // 支持测试模式：直接传入 SMTP 配置，无需先保存到数据库
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

    await sendReplyEmail(
      smtpConfig,
      to, '', subject, emailBody,
    );

    // 创建跟进记录（仅当有 customerId 时）
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
    console.error('email-send error:', e?.message || e);
    return NextResponse.json({ error: e.message || '发送失败' }, { status: 500 });
  }
}
