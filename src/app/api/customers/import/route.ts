import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { getTokenPayload } from '@/lib/auth';

const prisma = new PrismaClient();

// 智能字段映射表：支持各种可能的表头写法
const FIELD_MAP: Record<string, { field: string; isContact?: boolean }> = {
  // 公司名称
  'company_name': { field: 'companyName' },
  'company name': { field: 'companyName' },
  'company': { field: 'companyName' },
  '公司名称': { field: 'companyName' },
  '公司名': { field: 'companyName' },
  '公司': { field: 'companyName' },
  '企业名称': { field: 'companyName' },
  '客户名称': { field: 'companyName' },
  '客户名': { field: 'companyName' },
  '客户': { field: 'companyName' },
  'name': { field: 'companyName' },
  '名称': { field: 'companyName' },
  
  // 邮箱
  'email': { field: 'email' },
  'e-mail': { field: 'email' },
  '邮箱': { field: 'email' },
  '邮件': { field: 'email' },
  '公司邮箱': { field: 'email' },
  '电子邮箱': { field: 'email' },
  
  // 电话
  'phone': { field: 'phone' },
  'tel': { field: 'phone' },
  'telephone': { field: 'phone' },
  '电话': { field: 'phone' },
  '电话号码': { field: 'phone' },
  '联系电话': { field: 'phone' },
  '公司电话': { field: 'phone' },
  
  // 国家
  'country': { field: 'country' },
  '国家': { field: 'country' },
  '国家/地区': { field: 'country' },
  '地区': { field: 'country' },
  'nation': { field: 'country' },
  
  // 行业
  'industry': { field: 'industry' },
  '行业': { field: 'industry' },
  '公司行业': { field: 'industry' },
  '所属行业': { field: 'industry' },
  'sector': { field: 'industry' },
  
  // 地址
  'address': { field: 'address' },
  '地址': { field: 'address' },
  '公司地址': { field: 'address' },
  '联系地址': { field: 'address' },
  'addr': { field: 'address' },
  
  // 网址
  'website': { field: 'website' },
  '网址': { field: 'website' },
  '网站': { field: 'website' },
  '公司网址': { field: 'website' },
  '官网': { field: 'website' },
  'url': { field: 'website' },
  'web': { field: 'website' },
  
  // 企业规模
  'enterprise_scale': { field: 'enterpriseScale' },
  '规模': { field: 'enterpriseScale' },
  '企业规模': { field: 'enterpriseScale' },
  '公司规模': { field: 'enterpriseScale' },
  'scale': { field: 'enterpriseScale' },
  'size': { field: 'enterpriseScale' },
  
  // 注册资本
  'reg_capital': { field: 'regCapital' },
  '注册资本': { field: 'regCapital' },
  '注册资金': { field: 'regCapital' },
  'capital': { field: 'regCapital' },
  
  // 员工人数
  'employee_count': { field: 'employeeCount' },
  '员工人数': { field: 'employeeCount' },
  '员工': { field: 'employeeCount' },
  '员工数': { field: 'employeeCount' },
  'employees': { field: 'employeeCount' },
  
  // 成立日期
  'establish_date': { field: 'establishDate' },
  '成立日期': { field: 'establishDate' },
  '成立时间': { field: 'establishDate' },
  'established': { field: 'establishDate' },
  '创建日期': { field: 'establishDate' },
  
  // 传真
  'fax': { field: 'fax' },
  '传真': { field: 'fax' },
  
  // 社媒
  'social_media': { field: 'socialMedia' },
  '社媒': { field: 'socialMedia' },
  '社交媒体': { field: 'socialMedia' },
  'social': { field: 'socialMedia' },
  
  // 备注
  'notes': { field: 'notes' },
  '备注': { field: 'notes' },
  '备注信息': { field: 'notes' },
  '说明': { field: 'notes' },
  'remark': { field: 'notes' },
  'remarks': { field: 'notes' },
  
  // 联系人（注意：isContact标记）
  'contact_name': { field: 'contactName', isContact: true },
  '联系人姓名': { field: 'contactName', isContact: true },
  '联系人': { field: 'contactName', isContact: true },
  'contact person': { field: 'contactName', isContact: true },
  'contact': { field: 'contactName', isContact: true },
  
  'contact_position': { field: 'contactPosition', isContact: true },
  '联系人职位': { field: 'contactPosition', isContact: true },
  '职位': { field: 'contactPosition', isContact: true },
  'position': { field: 'contactPosition', isContact: true },
  'title': { field: 'contactPosition', isContact: true },
  
  'contact_email': { field: 'contactEmail', isContact: true },
  '联系人邮箱': { field: 'contactEmail', isContact: true },
  
  'contact_whatsapp': { field: 'contactWhatsapp', isContact: true },
  '联系人WhatsApp': { field: 'contactWhatsapp', isContact: true },
  'whatsapp': { field: 'contactWhatsapp', isContact: true },
  'WhatsApp': { field: 'contactWhatsapp', isContact: true },
  
  'contact_phone': { field: 'contactPhone', isContact: true },
  '联系人电话': { field: 'contactPhone', isContact: true },
  '手机': { field: 'contactPhone', isContact: true },
  'mobile': { field: 'contactPhone', isContact: true },
  
  'contact_remarks': { field: 'contactRemarks', isContact: true },
  '联系人备注': { field: 'contactRemarks', isContact: true },
};

// 智能匹配表头
function matchHeader(header: string): { field: string; isContact?: boolean } | null {
  const raw = header.toString().trim();
  const lower = raw.toLowerCase();
  
  // 1. 优先精确匹配原始值
  if (FIELD_MAP[lower]) return FIELD_MAP[lower];
  if (FIELD_MAP[raw]) return FIELD_MAP[raw];
  
  // 2. 清理后匹配（替换 * 和 - 为空格，保留下划线）
  const clean = lower
    .replace(/[\*\-]/g, ' ')
    .replace(/\s+/g, ' ');
  if (FIELD_MAP[clean]) return FIELD_MAP[clean];
  
  // 3. 模糊匹配（保留原始key检查）
  for (const [key, value] of Object.entries(FIELD_MAP)) {
    if (lower.includes(key) || key.includes(lower) || clean.includes(key) || key.includes(clean)) {
      return value;
    }
  }
  
  return null;
}

// 智能日期解析
function parseDateFlexible(value: any): Date | null {
  if (!value) return null;
  
  // 已经是Date或数字（Excel日期序列号）
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel日期序列号
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }
  
  const str = String(value).trim();
  if (!str) return null;
  
  // 尝试多种日期格式
  const formats = [
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
    /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/,
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
    /^(\d{4})(\d{2})(\d{2})$/,
  ];
  
  for (const fmt of formats) {
    const match = str.match(fmt);
    if (match) {
      const [_, a, b, c] = match;
      let y: number, m: number, d: number;
      // 判断哪个是年份
      if (parseInt(a) > 1900) {
        y = parseInt(a); m = parseInt(b); d = parseInt(c);
      } else {
        d = parseInt(a); m = parseInt(b); y = parseInt(c);
      }
      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return new Date(y, m - 1, d);
      }
    }
  }
  
  return null;
}

// 确保数据库 schema 与 Prisma schema 同步（处理 Vercel 构建时 prisma db push 可能未执行的情况）
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS level VARCHAR(1) DEFAULT 'C'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id TEXT`);
  } catch (e) {
    console.warn('Schema ensure warning:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const payload = getTokenPayload();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const skipDuplicates = formData.get('skipDuplicates') !== 'false'; // 默认跳过重复
    
    if (!file) {
      return NextResponse.json({ success: false, error: '请上传文件' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    if (rawData.length === 0) {
      return NextResponse.json({ success: false, error: 'Excel文件中没有数据' }, { status: 400 });
    }

    // 智能映射表头
    const headers = Object.keys(rawData[0]);
    const mapping: Record<string, { field: string; isContact?: boolean }> = {};
    const unmapped: string[] = [];
    
    for (const header of headers) {
      const mapped = matchHeader(header);
      if (mapped) {
        mapping[header] = mapped;
      } else if (header.toString().trim()) {
        unmapped.push(header.toString());
      }
    }
    
    // 过滤空行
    const data = rawData.filter(row => {
      const values = Object.values(row).map(v => String(v || '').trim());
      return values.some(v => v.length > 0);
    });

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; field: string; message: string }>,
      duplicates: [] as string[],
      mapping: Object.entries(mapping).map(([original, mapped]) => ({
        original,
        target: mapped.field + (mapped.isContact ? ' (联系人)' : ''),
      })),
      unmappedHeaders: unmapped,
    };

    // 批量检查已存在的公司
    const companyNames = data.map(row => {
      for (const [header, mappedField] of Object.entries(mapping)) {
        if (mappedField.field === 'companyName') {
          return String(row[header] || '').trim();
        }
      }
      return '';
    }).filter(Boolean);
    
    const existingCompanies = await prisma.customer.findMany({
      where: { companyName: { in: companyNames } },
      select: { companyName: true },
    });
    const existingNames = new Set(existingCompanies.map(c => c.companyName));

    // 使用事务批量创建（每20个一批）
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // 提取字段
        let companyName = '';
        const customerData: Record<string, any> = {};
        const contactData: Record<string, any> = {};
        
        for (const [header, value] of Object.entries(row)) {
          const mapped = mapping[header];
          if (!mapped) continue;
          
          const strValue = String(value || '').trim();
          if (!strValue) continue;
          
          if (mapped.isContact) {
            contactData[mapped.field] = strValue;
          } else {
            if (mapped.field === 'companyName') {
              companyName = strValue;
            } else if (mapped.field === 'establishDate') {
              const d = parseDateFlexible(value);
              if (d) customerData[mapped.field] = d;
            } else if (mapped.field === 'employeeCount') {
              const num = parseInt(strValue);
              if (!isNaN(num)) customerData[mapped.field] = num;
            } else {
              customerData[mapped.field] = strValue;
            }
          }
        }
        
        if (!companyName) {
          results.failed++;
          results.errors.push({ row: i + 1, field: '公司名称', message: '公司名称为空，无法导入' });
          continue;
        }
        
        // 检查重复
        if (skipDuplicates && existingNames.has(companyName)) {
          results.skipped++;
          results.duplicates.push(companyName);
          continue;
        }

        // 创建客户
        const customer = await prisma.customer.create({
          data: { companyName, status: 'active', userId: payload?.userId || null, ...customerData },
        });

        // 创建联系人（如果有姓名）
        if (contactData.contactName || contactData.contactPhone || contactData.contactEmail) {
          await prisma.contact.create({
            data: {
              customerId: customer.id,
              name: contactData.contactName || contactData.contactEmail || contactData.contactPhone || '未命名联系人',
              position: contactData.contactPosition || null,
              email: contactData.contactEmail || null,
              whatsapp: contactData.contactWhatsapp || null,
              phone: contactData.contactPhone || null,
              remarks: contactData.contactRemarks || null,
            },
          });
        }

        // 更新已存在列表
        existingNames.add(companyName);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ row: i + 1, field: '系统', message: error.message || '创建失败' });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || '导入失败' },
      { status: 500 }
    );
  }
}
