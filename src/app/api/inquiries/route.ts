import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchUnreadEmails } from '@/lib/email/imap-client';
import { isInquiryEmail } from '@/lib/email/inquiry-keywords';
import { extractInquiryPoints, generateReplyDraft } from '@/lib/ai-siliconflow';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取询价列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { fromEmail: { contains: search } },
        { fromName: { contains: search } },
        { body: { contains: search } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: { select: { id: true, companyName: true } } },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: inquiries, total, page, limit });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json({ success: false, error: '获取询价列表失败' }, { status: 500 });
  }
}

// POST: 手动拉取邮件 / 创建询价
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 如果有 action=sync，拉取邮件
    if (body.action === 'sync') {
      const config = await prisma.emailConfig.findFirst({ where: { isActive: true } });
      if (!config) {
        return NextResponse.json({ success: false, error: '请先配置邮箱' }, { status: 400 });
      }

      const since = config.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const emails = await fetchUnreadEmails(
        { host: config.imapHost, port: config.imapPort, user: config.imapUser, password: config.imapPass },
        since
      );

      let newCount = 0;
      for (const email of emails) {
        // 检查是否已存在
        const exists = await prisma.inquiry.findUnique({ where: { messageId: email.messageId } });
        if (exists) continue;

        const { isInquiry, language, matchedKeywords } = isInquiryEmail(email.subject, email.body);
        if (!isInquiry) continue;

        // 匹配客户
        const customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { email: email.fromEmail },
              { contacts: { some: { email: email.fromEmail } } },
            ],
          },
        });

        // 创建询价记录
        const inquiry = await prisma.inquiry.create({
          data: {
            emailConfigId: config.id,
            customerId: customer?.id || null,
            messageId: email.messageId,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            subject: email.subject,
            body: email.body,
            bodyHtml: email.bodyHtml,
            language,
            status: 'new',
          },
        });

        // 异步调用 AI
        try {
          const points = await extractInquiryPoints(email.subject, email.body, language);
          const customerInfo = customer
            ? `${customer.companyName} (${customer.country || ''}) - ${customer.industry || ''}`
            : '';
          const draft = await generateReplyDraft(email.subject, email.body, language, customerInfo, points);

          await prisma.inquiry.update({
            where: { id: inquiry.id },
            data: {
              productInterested: points.productInterested,
              quantity: points.quantity,
              deliveryRequired: points.deliveryRequired,
              aiSummary: points.summary,
              aiDraftSubject: draft.subject,
              aiDraftBody: draft.body,
              status: 'processing',
            },
          });
        } catch (aiError) {
          console.error('AI processing error:', aiError);
        }

        newCount++;
      }

      // 更新同步时间
      await prisma.emailConfig.update({
        where: { id: config.id },
        data: { lastSyncAt: new Date() },
      });

      return NextResponse.json({ success: true, message: `成功拉取 ${newCount} 条新询价`, created: newCount });
    }

    return NextResponse.json({ success: false, error: '不支持的操作' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}
