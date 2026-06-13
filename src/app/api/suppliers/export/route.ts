import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);
    const search = searchParams.get('search') || '';
    const cooperationStatus = searchParams.get('cooperationStatus') || '';
    const riskLevel = searchParams.get('riskLevel') || '';
    const country = searchParams.get('country') || '';

    const where: any = {};

    if (ids?.length) {
      where.id = { in: ids };
    } else {
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { country: { contains: search, mode: 'insensitive' } },
          { mainProducts: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (cooperationStatus) where.cooperationStatus = cooperationStatus;
      if (riskLevel) where.riskLevel = riskLevel;
      if (country) where.country = country;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // 生成 CSV（Excel 兼容）
    const headers = ['公司名称', '国家', '主要产品', '合作状态', '风险等级', '风险类型', '电话', '邮箱', '网站', '地址', '成立日期', '订单金额', '备注', '更新时间'];
    const statusMap: Record<string, string> = { potential: '潜在', active: '合作中', suspended: '暂停', terminated: '终止' };
    const riskMap: Record<string, string> = { high: '高', medium: '中', low: '低' };

    const rows = suppliers.map(s => [
      s.name,
      s.country || '',
      s.mainProducts || '',
      statusMap[s.cooperationStatus] || s.cooperationStatus,
      riskMap[s.riskLevel || ''] || s.riskLevel || '',
      s.riskTypes || '',
      s.phone || '',
      s.email || '',
      s.website || '',
      s.address || '',
      s.foundedDate ? new Date(s.foundedDate).toISOString().split('T')[0] : '',
      s.orderAmount?.toString() || '',
      s.notes || '',
      new Date(s.updatedAt).toISOString().split('T')[0],
    ]);

    const BOM = '\uFEFF';
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new NextResponse(BOM + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="suppliers-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting suppliers:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
