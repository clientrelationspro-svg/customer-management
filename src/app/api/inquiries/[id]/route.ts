import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { extractInquiryPoints, generateReplyDraft } from '@/lib/ai-siliconflow';
import { sendReplyEmail } from '@/lib/email/smtp-sender';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: 获取单个询价详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, companyName: true, country: true, industry: true } },
        replies: { orderBy: { sentAt: 'desc' } },
      },
    });
    if (!inquiry) return NextResponse.json({ error: '询价不存在' }, { status: 404 });
    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    return NextResponse.json({ error: '获取询价失败' }, { status: 500 });
  }
}

// PATCH: 更新询价（审核回复内容、关联客户等）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { action, customerId, finalSubject, finalBody, regenerateDraft, userNotes } = body;

    const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
    if (!inquiry) return NextResponse.json({ error: '询价不存在' }, { status: 404 });

    // 重新生成 AI 草稿
    if (regenerateDraft) {
      try {
        const customer = customerId
          ? await prisma.customer.findUnique({ where: { id: customerId }, select: { companyName: true, country: true, industry: true } })
          : null;
        const customerInfo = customer ? `${customer.companyName} (${customer.country || ''}) - ${customer.industry || ''}` : '';

        const draft = await generateReplyDraft(
          inquiry.subject, inquiry.body, inquiry.language || 'en', customerInfo,
          { productInterested: inquiry.productInterested || '', quantity: inquiry.quantity || '', deliveryRequired: inquiry.deliveryRequired || '' },
          userNotes || ''
        );

        if (!draft.subject || !draft.body) {
          return NextResponse.json({ success: false, error: 'AI 返回内容为空，请重试或检查 API 配置' });
        }

        await prisma.inquiry.update({
          where: { id: params.id },
          data: { aiDraftSubject: draft.subject, aiDraftBody: draft.body },
        });

        return NextResponse.json({ success: true, data: { aiDraftSubject: draft.subject, aiDraftBody: draft.body } });
      } catch (e: any) {
        console.error('AI draft generation error:', e?.message || e);
        return NextResponse.json({ success: false, error: `AI 生成失败: ${e?.message || '请检查 SiliconFlow API 配置'}` }, { status: 500 });
      }
    }

    // 更新字段
    const updateData: any = {};
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (finalSubject !== undefined) updateData.finalSubject = finalSubject;
    if (finalBody !== undefined) updateData.finalBody = finalBody;
    if (action === 'review') updateData.status = 'reviewed';

    await prisma.inquiry.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除/归档询价
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.inquiry.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
