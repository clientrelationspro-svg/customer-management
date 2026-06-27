import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH: 更新配置（仅限自己的配置）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const existing = await prisma.emailConfig.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== payload.userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const body = await request.json();

    if (body.isActive) {
      await prisma.emailConfig.updateMany({ where: { userId: payload.userId }, data: { isActive: false } });
    }

    const data: any = {};
    if (body.imapHost) data.imapHost = body.imapHost;
    if (body.imapPort) data.imapPort = parseInt(body.imapPort);
    if (body.imapUser) data.imapUser = body.imapUser;
    if (body.imapPass) data.imapPass = body.imapPass;
    if (body.smtpHost) data.smtpHost = body.smtpHost;
    if (body.smtpPort) data.smtpPort = parseInt(body.smtpPort);
    if (body.smtpUser) data.smtpUser = body.smtpUser;
    if (body.smtpPass) data.smtpPass = body.smtpPass;
    if (body.fromName !== undefined) data.fromName = body.fromName;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const config = await prisma.emailConfig.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: config });
  } catch (e: any) {
    console.error('email-config PATCH error:', e?.message || e);
    return NextResponse.json({ error: '更新失败: ' + (e?.message || '未知错误') }, { status: 500 });
  }
}

// DELETE: 删除配置（仅限自己的配置）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const existing = await prisma.emailConfig.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== payload.userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    await prisma.emailConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('email-config DELETE error:', e?.message || e);
    return NextResponse.json({ error: '删除失败: ' + (e?.message || '未知错误') }, { status: 500 });
  }
}
