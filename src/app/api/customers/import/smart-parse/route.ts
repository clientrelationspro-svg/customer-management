import { NextRequest, NextResponse } from 'next/server';

interface ParsedField {
  value: string;
  confidence: number; // 0-1
  source: string; // where this field was found
}

interface ParsedCustomer {
  companyName: ParsedField;
  country?: ParsedField;
  industry?: ParsedField;
  email?: ParsedField;
  phone?: ParsedField;
  website?: ParsedField;
  address?: ParsedField;
  enterpriseScale?: ParsedField;
  notes?: ParsedField;
  contactName?: ParsedField;
  contactPosition?: ParsedField;
  contactEmail?: ParsedField;
  contactPhone?: ParsedField;
  contactWhatsapp?: ParsedField;
}

// 已知国家列表（部分常用）
const KNOWN_COUNTRIES = [
  'China', 'United States', 'USA', 'Germany', 'UK', 'United Kingdom', 'France', 
  'Italy', 'Spain', 'Japan', 'Korea', 'South Korea', 'Brazil', 'India', 'Canada',
  'Australia', 'Mexico', 'Russia', 'Netherlands', 'Switzerland', 'Sweden',
  '中国', '美国', '德国', '英国', '法国', '意大利', '西班牙', '日本', '韩国',
  '巴西', '印度', '加拿大', '澳大利亚', '墨西哥', '俄罗斯', '荷兰', '瑞士', '瑞典',
  '阿联酋', 'UAE', '沙特', 'Saudi Arabia', '土耳其', 'Turkey', '越南', 'Vietnam',
  '泰国', 'Thailand', '马来西亚', 'Malaysia', '印尼', 'Indonesia', '新加坡', 'Singapore',
];

function normalizeCountry(input: string): string {
  const map: Record<string, string> = {
    'usa': 'United States', '美国': 'United States', 'uk': 'United Kingdom',
    '英国': 'United Kingdom', '德国': 'Germany', 'germany': 'Germany',
    '法国': 'France', 'france': 'France', '意大利': 'Italy', 'italy': 'Italy',
    '西班牙': 'Spain', 'spain': 'Spain', '日本': 'Japan', 'japan': 'Japan',
    '韩国': 'South Korea', 'south korea': 'South Korea', 'korea': 'South Korea',
    '巴西': 'Brazil', 'brazil': 'Brazil', '印度': 'India', 'india': 'India',
    '加拿大': 'Canada', 'canada': 'Canada', '俄罗斯': 'Russia', 'russia': 'Russia',
    '荷兰': 'Netherlands', 'netherlands': 'Netherlands',
    '瑞士': 'Switzerland', 'switzerland': 'Switzerland',
    '瑞典': 'Sweden', 'sweden': 'Sweden', '澳大利亚': 'Australia', 'australia': 'Australia',
    '阿联酋': 'UAE', 'uae': 'UAE', '沙特': 'Saudi Arabia', 'saudi arabia': 'Saudi Arabia',
    '土耳其': 'Turkey', 'turkey': 'Turkey', '越南': 'Vietnam', 'vietnam': 'Vietnam',
    '泰国': 'Thailand', 'thailand': 'Thailand',
    '马来西亚': 'Malaysia', 'malaysia': 'Malaysia',
    '印尼': 'Indonesia', 'indonesia': 'Indonesia',
    '新加坡': 'Singapore', 'singapore': 'Singapore',
    '墨西哥': 'Mexico', 'mexico': 'Mexico',
  };
  return map[input.toLowerCase()] || input;
}

function parseTextBlock(text: string): ParsedCustomer[] {
  const customers: ParsedCustomer[] = [];
  
  // 首先尝试按明显的客户分隔来分割
  // 分隔符：空行、---、===、***等
  const blocks = text.split(/\n\n\n+|\n---+\n|\n===+\n|\n\*\*\*+\n/);
  
  // 如果只有一个大块，尝试按每行或每个实体分割
  let customerBlocks: string[];
  if (blocks.length <= 1) {
    // 尝试按每5行分割，或按特定模式
    customerBlocks = [text];
  } else {
    customerBlocks = blocks.filter(b => b.trim().length > 0);
  }

  for (const block of customerBlocks) {
    const customer = parseSingleBlock(block);
    if (customer) customers.push(customer);
  }

  return customers;
}

function parseSingleBlock(text: string): ParsedCustomer | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return null;

  const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 构建所有行的完整文本用于模式匹配
  const fullText = lines.join(' | ');

  // --- 公司名称 ---
  let companyName: ParsedField | undefined;
  
  // 方式1：第一行作为公司名（最常见）
  const firstLine = lines[0].replace(/^[#\-\*\s]+|[#\-\*\s]+$/g, '').trim();
  if (firstLine && firstLine.length > 1) {
    // 排除第一行是邮箱/电话/网址的情况
    const isContact = /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(firstLine) || 
                      /^[\+]?[\d\s\-\(\)]+$/.test(firstLine) ||
                      /^https?:\/\//.test(firstLine);
    if (!isContact) {
      companyName = { value: firstLine, confidence: 0.7, source: '首行' };
    }
  }

  // 方式2：搜索 "公司名称：" "Company:" "公司：" 等模式
  const companyPatterns = [
    /(?:公司名称|客户名称|企业名称|Company\s*Name|Company|To)[：:\s]+(.+?)(?=[\n,，]|$)/i,
    /(.+?(?:公司|Ltd\.?|Co\.,?\s*Ltd\.?|Inc\.?|Corp\.?|LLC|GmbH|SARL|S\.A\.|S\.p\.A\.|Pty\s*Ltd))/i,
  ];
  for (const pattern of companyPatterns) {
    const match = fullText.match(pattern);
    if (match && match[1] && !companyName) {
      companyName = { value: match[1].trim(), confidence: 0.9, source: '模式匹配' };
    }
  }

  if (!companyName) {
    // 尝试找到最可能的公司名行
    for (const line of lines) {
      const cleanLine = line.replace(/^[#\-\*\s•·]+/, '').trim();
      if (cleanLine.length > 2 && 
          !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(cleanLine) &&
          !/^[\+]?[\d\s\-\(\)]{5,}$/.test(cleanLine) &&
          !/^https?:\/\//.test(cleanLine) &&
          !KEYS.some(k => cleanLine.startsWith(k))) {
        companyName = { value: cleanLine, confidence: 0.4, source: '推测' };
        break;
      }
    }
  }

  if (!companyName) return null;

  // --- 提取各种字段 ---
  const customer: ParsedCustomer = { companyName };

  // 邮箱
  const emailMatch = fullText.match(/([\w.+-]+@[\w-]+\.[\w.]+)/);
  if (emailMatch) {
    customer.email = { value: emailMatch[1].toLowerCase(), confidence: 0.95, source: '正则' };
  }

  // 电话
  const phonePatterns = [
    /Tel[：:.\s]*([+\d\s\-\(\)]{7,20})/i,
    /Phone[：:.\s]*([+\d\s\-\(\)]{7,20})/i,
    /电话[：:.\s]*([+\d\s\-\(\)]{7,20})/,
    /TEL[：:.\s]*([+\d\s\-\(\)]{7,20})/,
    /([+\d]{10,20})/,
  ];
  for (const pattern of phonePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const phone = match[1].trim();
      // 确保不误匹配数字ID
      if (phone.replace(/[\s\-\(\)]/g, '').length >= 7) {
        customer.phone = { value: phone, confidence: 0.85, source: '正则' };
        break;
      }
    }
  }

  // 网址
  const urlMatch = fullText.match(/(?:网址|Web|Website|URL|Site|www|http)[：:.\s]*(https?:\/\/[\w./-]+|www\.[\w./-]+|[\w-]+\.[a-z]{2,}\/[\w./-]*)/i);
  if (urlMatch) {
    let url = urlMatch[1];
    if (!url.startsWith('http')) url = 'https://' + url;
    customer.website = { value: url, confidence: 0.9, source: '正则' };
  }

  // 国家
  for (const country of KNOWN_COUNTRIES) {
    if (fullText.includes(country)) {
      customer.country = { value: normalizeCountry(country), confidence: 0.85, source: '已知国家' };
      break;
    }
  }
  // 尝试从地址中提取国家
  if (!customer.country) {
    const countryMatch = fullText.match(/(?:国家|Country|Nation)[：:.\s]*([^\n,，|]{2,20})/i);
    if (countryMatch) {
      customer.country = { value: normalizeCountry(countryMatch[1].trim()), confidence: 0.7, source: '字段匹配' };
    }
  }

  // 地址
  const addrMatch = fullText.match(/(?:地址|Address|Addr|Add)[：:.\s]+([^\n,，]{5,100})/i);
  if (addrMatch) {
    customer.address = { value: addrMatch[1].trim(), confidence: 0.8, source: '字段匹配' };
  }

  // 行业
  const industryMatch = fullText.match(/(?:行业|Industry|Sector|Field)[：:.\s]+([^\n,，]{2,30})/i);
  if (industryMatch) {
    customer.industry = { value: industryMatch[1].trim(), confidence: 0.8, source: '字段匹配' };
  }

  // 联系人
  const contactPatterns = [
    /(?:联系人|Contact|Attn|Attn\.|Attention)[：:.\s]+([^\n,，]{2,30})/i,
    /(?:接洽人|担当者)[：:.\s]+([^\n,，]{2,30})/,
  ];
  for (const pattern of contactPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      customer.contactName = { value: match[1].trim(), confidence: 0.75, source: '字段匹配' };
      break;
    }
  }

  // 职位
  const posMatch = fullText.match(/(?:职位|Position|Title|职务)[：:.\s]+([^\n,，]{2,30})/i);
  if (posMatch) {
    customer.contactPosition = { value: posMatch[1].trim(), confidence: 0.75, source: '字段匹配' };
  }

  // 联系人电话
  const cPhoneMatch = fullText.match(/(?:手机|Mobile|Cell|Mob|WhatsApp|Whatsapp|whatsapp)[：:.\s]*([+\d\s\-\(\)]{7,20})/i);
  if (cPhoneMatch) {
    const phone = cPhoneMatch[1].trim();
    customer.contactPhone = { value: phone, confidence: 0.85, source: '正则' };
    customer.contactWhatsapp = { value: phone, confidence: 0.7, source: '同手机号' };
  }

  // 联系人邮箱
  if (!customer.contactPhone) {
    const cEmailMatch = fullText.match(/(?:联系人邮箱|Contact\s*Email)[：:.\s]*([\w.+-]+@[\w-]+\.[\w.]+)/i);
    if (cEmailMatch) {
      customer.contactEmail = { value: cEmailMatch[1].toLowerCase(), confidence: 0.9, source: '字段匹配' };
    }
  }

  // 企业规模
  const scaleMatch = fullText.match(/(?:规模|Size|Scale|员工|Employee)[：:.\s]*(\d+[\s\-~]*\d*\s*(?:人|people|employees|staff)?)/i);
  if (scaleMatch) {
    customer.enterpriseScale = { value: scaleMatch[1].trim(), confidence: 0.7, source: '字段匹配' };
  }

  return customer;
}

// 常见标签关键词
const KEYS = [
  '公司名称', '企业名称', '公司', 'Company', '客户', 'Customer',
  '电话', 'Tel', 'Phone', '手机', 'Mobile', 'Cell',
  '邮箱', 'Email', 'E-mail', 'Mail',
  '联系人', 'Contact', 'Attn',
  '地址', 'Address', 'Addr',
  '网址', 'Web', 'Website', 'URL',
  '国家', 'Country', 'Nation',
  '行业', 'Industry', 'Sector',
  '职位', 'Position', 'Title',
  'WhatsApp', 'Whatsapp', 'whatsapp',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: '请提供文本内容' }, { status: 400 });
    }

    const customers = parseTextBlock(text.trim());

    // 计算总体统计
    const total = customers.length;
    const highConfidence = customers.filter(c => c.companyName.confidence >= 0.7).length;

    return NextResponse.json({
      success: true,
      data: {
        customers: customers.map(c => ({
          companyName: c.companyName.value,
          country: c.country?.value || '',
          industry: c.industry?.value || '',
          email: c.email?.value || '',
          phone: c.phone?.value || '',
          website: c.website?.value || '',
          address: c.address?.value || '',
          enterpriseScale: c.enterpriseScale?.value || '',
          contactName: c.contactName?.value || '',
          contactPosition: c.contactPosition?.value || '',
          contactEmail: c.contactEmail?.value || '',
          contactPhone: c.contactPhone?.value || '',
          contactWhatsapp: c.contactWhatsapp?.value || '',
          _confidence: {
            companyName: c.companyName.confidence,
            country: c.country?.confidence || 0,
            email: c.email?.confidence || 0,
            phone: c.phone?.confidence || 0,
          },
          _source: c.companyName.source,
        })),
        stats: { total, highConfidence },
      },
    });
  } catch (error: any) {
    console.error('Smart parse error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '解析失败' },
      { status: 500 }
    );
  }
}
