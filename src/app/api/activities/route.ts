import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth';

async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_id TEXT,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_activity_user_date ON activity_logs(user_id, created_at)`);
  } catch (e) { /* skip */ }
}

// GET - 获取统计数据（今日）
export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!payload) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today'; // today, week, all
    const userId = searchParams.get('userId') || undefined;

    // 计算时间范围
    let startDate: Date;
    const now = new Date();
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(0);
    }

    const where: any = { createdAt: { gte: startDate } };
    // 非管理员只能看自己的活动
    if (payload.role !== 'admin') {
      where.userId = payload.userId;
    } else if (userId) {
      where.userId = userId;
    }

    // 获取各项统计
    const [customerAdded, emailSent, whatsappSent, phoneCalled, activities] = await Promise.all([
      prisma.activityLog.count({ where: { ...where, action: 'customer_added' } }),
      prisma.activityLog.count({ where: { ...where, action: 'email_sent' } }),
      prisma.activityLog.count({ where: { ...where, action: 'whatsapp_sent' } }),
      prisma.activityLog.count({ where: { ...where, action: 'phone_called' } }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, action: true, customerId: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: { customerAdded, emailSent, whatsappSent, phoneCalled },
        total: customerAdded + emailSent + whatsappSent + phoneCalled,
        activities,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

// POST - 记录活动
export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    if (!payload) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { action, customerId } = await request.json();
    if (!action || !['customer_added', 'email_sent', 'whatsapp_sent', 'phone_called'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的活动类型' }, { status: 400 });
    }

    const activity = await prisma.activityLog.create({
      data: { userId: payload.userId, customerId: customerId || null, action },
    });

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    return NextResponse.json({ success: false, error: '记录失败' }, { status: 500 });
  }
}
