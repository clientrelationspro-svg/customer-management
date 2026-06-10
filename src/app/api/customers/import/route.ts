import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请上传文件' },
        { status: 400 }
      );
    }
    
    // 读取Excel文件
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'buffer' });
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Excel文件中没有数据' },
        { status: 400 }
      );
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      duplicates: [] as string[],
    };
    
    // 字段映射（支持中英文header）
    const getField = (row: any, chinese: string, english: string) => {
      return row[chinese] || row[english] || null;
    };
    
    // 批量创建客户和联系人
    for (const row of data as any[]) {
      try {
        const companyName = getField(row, '公司名称', 'company_name');
        
        if (!companyName) {
          results.failed++;
          results.errors.push(`第${results.success + results.failed + 1}行：公司名称不能为空`);
          continue;
        }
        
        // 检查是否已存在
        const existing = await prisma.customer.findFirst({
          where: { companyName },
        });
        
        if (existing) {
          results.failed++;
          results.duplicates.push(companyName);
          continue;
        }
        
        // 创建客户
        const customer = await prisma.customer.create({
          data: {
            companyName,
            enterpriseScale: getField(row, '企业规模', 'enterprise_scale'),
            country: getField(row, '国家', 'country'),
            establishDate: getField(row, '成立日期', 'establish_date') ? new Date(getField(row, '成立日期', 'establish_date')) : null,
            address: getField(row, '地址', 'address'),
            regCapital: getField(row, '注册资本', 'reg_capital'),
            industry: getField(row, '公司行业', 'industry'),
            employeeCount: getField(row, '员工人数', 'employee_count') ? parseInt(getField(row, '员工人数', 'employee_count')) : null,
            notes: getField(row, '备注信息', 'notes'),
            phone: getField(row, '电话', 'phone'),
            fax: getField(row, '传真', 'fax'),
            website: getField(row, '网址', 'website'),
            email: getField(row, '邮箱', 'email'),
            socialMedia: getField(row, '社媒', 'social_media'),
            contactAddress: getField(row, '联系地址', 'contact_address'),
            status: 'active',
          },
        });
        
        // 创建联系人（如果有）
        const contactName = getField(row, '联系人姓名', 'contact_name');
        if (contactName) {
          await prisma.contact.create({
            data: {
              customerId: customer.id,
              name: contactName,
              position: getField(row, '联系人职位', 'contact_position'),
              email: getField(row, '联系人邮箱', 'contact_email'),
              whatsapp: getField(row, '联系人WhatsApp', 'contact_whatsapp'),
              phone: getField(row, '联系人电话', 'contact_phone'),
              remarks: getField(row, '联系人备注', 'contact_remarks'),
            },
          });
        }
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`第${results.success + results.failed}行：${error.message || '创建失败'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        ...results,
      },
    });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || '导入失败' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
