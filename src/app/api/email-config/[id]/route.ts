// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

function getUserIdFromCookie() {
  try {
    const token = require('next/headers').cookies().get('auth_token')?.value;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || null;
  } catch { return null; }
}

// PATCH: 更新配置（仅限自己的配置）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    // 验证所有权
    const existing = await prisma.emailConfig.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const body = await request.json();

    if (body.isActive) {
      await prisma.emailConfig.updateMany({ where: { userId }, data: { isActive: false } });
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
    if (body.fromName) data.fromName = body.fromName;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const config = await prisma.emailConfig.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除配置（仅限自己的配置）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const existing = await prisma.emailConfig.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    await prisma.emailConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
