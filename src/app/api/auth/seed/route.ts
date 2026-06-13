import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// 确保表结构同步
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_info TEXT`);
  } catch (e) { /* skip */ }
}

// GET - 初始化默认管理员账户
export async function GET() {
  try {
    await ensureSchema();
    const existing = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (existing) {
      // 如果管理员已存在但没有描述，更新之
      if (!existing.description) {
        await prisma.user.update({
          where: { email: 'admin@example.com' },
          data: { description: '外贸综合管理，覆盖欧美及东南亚市场' },
        });
      }
      return NextResponse.json({ success: true, message: '管理员账户已就绪', user: { email: existing.email, role: existing.role, description: existing.description || '外贸综合管理' } });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: '管理员',
        password: hashedPassword,
        role: 'admin',
        description: '外贸综合管理，覆盖欧美及东南亚市场',
      },
    });

    return NextResponse.json({ success: true, message: '管理员账户已创建', user: { email: user.email, role: user.role, description: user.description } });
  } catch (error) {
    return NextResponse.json({ success: false, error: '初始化失败: ' + String(error) }, { status: 500 });
  }
}
