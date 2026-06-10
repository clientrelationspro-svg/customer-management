import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有产品分类
export async function GET() {
  try {
    const categories = await prisma.$queryRaw<{ category: string }[]>`
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `;
    
    const categoryList = categories.map((c) => c.category);
    
    return NextResponse.json(categoryList);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
