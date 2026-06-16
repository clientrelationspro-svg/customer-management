import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// PATCH: 更新配置
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    // 如果设为活跃，先将其他配置设为非活跃
    if (body.isActive) {
      await prisma.emailConfig.updateMany({ data: { isActive: false } });
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

// DELETE: 删除配置
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.emailConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
