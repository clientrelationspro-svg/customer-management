import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 确保表存在
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS customer_needs (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        style TEXT,
        priority INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) { /* 表已存在 */ }
}

function normalizeCategory(cat: string): string {
  const map: Record<string, string> = {
    '产品需求': 'product_requirement', '需求': 'product_requirement', 'product': 'product_requirement',
    'requirement': 'product_requirement', '产品': 'product_requirement', 'products': 'product_requirement',
    '核心业务': 'product_requirement', '主营业务': 'product_requirement', 'core business': 'product_requirement',
    '合作切入点': 'cooperation_angle', '切入点': 'cooperation_angle', 'cooperation': 'cooperation_angle',
    'angle': 'cooperation_angle', '合作': 'cooperation_angle',
    '钩子': 'hook', 'hook': 'hook', '钩子信息': 'hook', '卖点': 'hook', '吸引点': 'hook', 'hooks': 'hook',
  };
  return map[cat.toLowerCase()] || 'product_requirement';
}

// 统一的分类标题匹配（支持 ##、**、【】、1. 2. 3. 等多种格式）
function matchCategoryHeader(line: string): string | null {
  // ## 核心业务 / ### 产品需求 等
  const h1 = line.match(/^#{1,4}\s*(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子(信息?)?|卖点|吸引点|Products?|Core Business|Cooperation|Angle|Hooks?)\s*[:：]?\s*$/i);
  if (h1) return normalizeCategory(h1[1].replace(/信息/, ''));
  // **核心业务** / **合作切入点**
  const h2 = line.match(/^\*{1,2}\s*(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子(信息?)?|卖点|吸引点|Products?|Core Business|Cooperation|Angle|Hooks?)\s*\*{0,2}\s*[:：]?\s*$/i);
  if (h2) return normalizeCategory(h2[1].replace(/信息/, ''));
  // 【核心业务】
  const h3 = line.match(/^【(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子(信息?)?|卖点|吸引点|Products?)】\s*[:：]?\s*$/i);
  if (h3) return normalizeCategory(h3[1].replace(/信息/, ''));
  // 1. 核心业务 / 2. 合作切入点 / 3. 钩子
  const h4 = line.match(/^\d+[\.、）\)]\s*(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子(信息?)?|卖点|吸引点)\s*[:：]?\s*$/i);
  if (h4) return normalizeCategory(h4[1]);
  return null;
}

function parseNeeds(text: string): Array<{ category: string; content: string; style?: string }> {
  const needs: Array<{ category: string; content: string; style?: string }> = [];

  // 先统一分隔符
  const normalized = text
    .replace(/\n\s*---+\s*\n/g, '\n[SEP]\n')
    .replace(/\n\s*\*\s*\*\s*\n/g, '\n[SEP]\n');

  // 按分隔符分割
  const blocks = normalized.split('[SEP]').map(b => b.trim()).filter(b => b.length > 5);

  for (const block of blocks) {
    // 将 block 按 ## / 【】 等标题分割成多个 section
    const sections = splitSections(block);
    
    if (sections.length > 0) {
      for (const sec of sections) {
        extractItems(sec.content, sec.category, needs);
      }
    } else {
      // 整个 block 无法分割，尝试直接匹配标题
      tryMatchBlock(block, needs);
    }
  }

  // 如果没有匹配到，整段作为一个分类
  if (needs.length === 0) {
    tryMatchBlock(text, needs);
  }

  return needs;
}

// 按 ## 产品需求 / 【产品需求】 等标题分割
function splitSections(block: string): Array<{ category: string; content: string }> {
  const sections: Array<{ category: string; content: string }> = [];
  const lines = block.split('\n');
  const headers: Array<{ index: number; category: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const cat = matchCategoryHeader(line);
    if (cat) {
      headers.push({ index: i, category: cat });
      continue;
    }
    // 匹配 "产品需求：内容" / "核心业务：xxx" 同一行有内容的情况
    const m3 = line.match(/^(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子信息?|卖点|吸引点)\s*[:：]\s*(.+)/);
    if (m3) {
      const cat = normalizeCategory(m3[1]);
      let contentEnd = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        if (matchCategoryHeader(lines[j].trim())) { contentEnd = j; break; }
      }
      sections.push({ category: cat, content: [m3[2], ...lines.slice(i + 1, contentEnd)].join('\n').trim() });
      i = contentEnd - 1;
    }
  }
  
  // 如果有标题，按标题分割
  if (headers.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const startIdx = headers[i].index + 1;
      const endIdx = i + 1 < headers.length ? headers[i + 1].index : lines.length;
      const content = lines.slice(startIdx, endIdx).join('\n').trim();
      if (content) sections.push({ category: headers[i].category, content });
    }
  }
  
  return sections;
}

function tryMatchBlock(block: string, needs: Array<{ category: string; content: string; style?: string }>) {
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const cat = matchCategoryHeader(lines[i].trim());
    if (cat) {
      const content = lines.slice(i + 1).join('\n').trim();
      if (content) extractItems(content, cat, needs);
      return;
    }
    // 匹配 "核心业务：xxx" 格式
    const m = lines[i].trim().match(/^(核心业务|产品需求?|主营业务|合作切入点?|切入点|钩子信息?|卖点|吸引点)\s*[:：]\s*(.+)/);
    if (m) {
      extractItems(m[2], normalizeCategory(m[1]), needs);
      return;
    }
  }
  // 兜底：整个 block 按 product_requirement 处理
  extractItems(block, 'product_requirement', needs);
}

function extractItems(text: string, category: string, needs: Array<{ category: string; content: string; style?: string }>) {
  // 按 - * 1. 等列表标记分割
  const items = text
    .split(/\n(?=[-*•·]\s|\d+[\.\)]\s)/)
    .map(s => s.replace(/^[-*•·]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(s => s.length > 3);

  if (items.length > 0) {
    for (const item of items) {
      // 提取风格标记（如果有）
      let content = item;
      let style: string | undefined;
      const styleMatch = item.match(/\[([^\]]+)\]\s*/);
      if (styleMatch) {
        style = styleMatch[1].trim();
        content = item.replace(styleMatch[0], '').trim();
      }
      if (content) {
        needs.push({ category, content, style });
      }
    }
  } else if (text.trim().length > 5) {
    // 单个条目
    needs.push({ category, content: text.trim() });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { customerId, text, category, defaultStyle } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: '请选择目标客户' }, { status: 400 });
    }
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: '请粘贴内容' }, { status: 400 });
    }

    // 如果指定了单一 category，直接用
    if (category && ['product_requirement', 'cooperation_angle', 'hook'].includes(category)) {
      const items = text.split('\n').map((s: string) => s.replace(/^[-*•·]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim()).filter((s: string) => s.length > 3);
      const results = [];
      for (const item of items) {
        try {
          const need = await prisma.customerNeed.create({
            data: { customerId, category, content: item, style: defaultStyle, source: 'ai_generated' },
          });
          results.push({ status: 'created', category, content: item, id: need.id });
        } catch (e) {
          results.push({ status: 'failed', category, content: item });
        }
      }
      return NextResponse.json({
        success: true,
        message: `成功导入 ${results.filter(r => r.status === 'created').length}/${items.length} 条`,
        total: items.length,
        created: results.filter(r => r.status === 'created').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      });
    }

    // 智能解析
    const parsed = parseNeeds(text);
    if (parsed.length === 0) {
      return NextResponse.json({ success: false, error: '未能解析出内容，请检查格式' }, { status: 400 });
    }

    const results = [];
    for (const item of parsed) {
      try {
        const need = await prisma.customerNeed.create({
          data: {
            customerId,
            category: item.category,
            content: item.content,
            style: item.style || defaultStyle,
            source: 'ai_generated',
          },
        });
        results.push({ status: 'created', category: item.category, content: item.content, id: need.id });
      } catch (e) {
        results.push({ status: 'failed', category: item.category, content: item.content });
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功导入 ${results.filter(r => r.status === 'created').length}/${parsed.length} 条`,
      total: parsed.length,
      created: results.filter(r => r.status === 'created').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  }
}
