import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';

async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_skills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'communication',
        workflow TEXT NOT NULL,
        goals TEXT NOT NULL,
        tips TEXT,
        tools TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    for (const col of ['workflow', 'goals', 'tips', 'tools']) {
      try { await prisma.$executeRawUnsafe(`ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS ${col} TEXT`); } catch {}
    }
  } catch {}
}

export async function GET() {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const skills = await prisma.userSkill.findMany({
      where: { userId: payload.userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: skills });
  } catch {
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!payload) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { name, category, workflow, goals, tips, tools } = await request.json();
    if (!name || !workflow || !goals) {
      return NextResponse.json({ success: false, error: '技能名称、工作流程、工作目标为必填' }, { status: 400 });
    }

    const skill = await prisma.userSkill.create({
      data: {
        userId: payload.userId,
        name, category: category || 'communication',
        workflow, goals, tips: tips || null, tools: tools || null,
      },
    });

    return NextResponse.json({ success: true, data: skill });
  } catch (e) {
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
