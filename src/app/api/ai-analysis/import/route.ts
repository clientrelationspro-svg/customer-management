import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeType(type: string): string {
  const t = type.toLowerCase().trim().replace(/"/g, '');
  if (t === 'whatsapp') return 'whatsapp';
  if (t === 'email' || t === '邮件') return 'email';
  if (t === 'phone' || t === '电话') return 'phone';
  if (t === 'wechat' || t === '微信') return 'wechat';
  return 'email';
}

function parseScriptsFromMarkdown(text: string): Array<{ type: string; title: string; content: string }> {
  const scripts: Array<{ type: string; title: string; content: string }> = [];

  // 去除AI可能添加的包装文字
  let cleaned = text
    .replace(/```[\s\S]*?\n/g, '')
    .replace(/```/g, '')
    .replace(/^(好的|当然|以下是|这是为您|Here are|Sure|Certainly)[\s\S]{0,200}?(?====\s*新增话术)/gi, '')
    .trim();

  // 格式1：按 === 新增话术 === 分割（新格式）
  if (cleaned.includes('=== 新增话术 ===') || cleaned.includes('===新增话术===')) {
    const blocks = cleaned.split(/===+\s*新增话术\s*===+/gi).map(b => b.trim()).filter(b => b.length > 5);
    for (const block of blocks) {
      const typeMatch = block.match(/type\s*[:：]\s*"?\s*(WhatsApp|Email|电话|WeChat|微信|whatsapp|email|phone|wechat)\s*"?/i);
      const titleMatch = block.match(/title\s*[:：]\s*"?\s*(.+?)\s*"?\s*$/im);
      const contentMatch = block.match(/content\s*[:：]\s*"?\s*\n?([\s\S]*)/i);
      
      if (typeMatch) {
        const type = normalizeType(typeMatch[1]);
        let title = titleMatch ? titleMatch[1].trim().replace(/^"|"$/g, '') : '话术';
        let content = '';
        if (contentMatch) {
          content = contentMatch[1].trim().replace(/^"|"$/g, '');
        } else {
          // 如果没找到 content: 标记，取剩余内容
          const idx = titleMatch ? block.indexOf(titleMatch[0]) + titleMatch[0].length : 
                      block.indexOf(typeMatch[0]) + typeMatch[0].length;
          content = block.substring(idx).trim();
        }
        if (content) {
          scripts.push({ type, title, content });
        }
      }
    }
    if (scripts.length > 0) return scripts;
  }

  // 格式2：旧格式兜底 — 按 ### [类型] 标题分割
  if (cleaned.includes('### [')) {
    // 去掉第一个 ### [ 之前的内容
    cleaned = cleaned.replace(/^[\s\S]*?(?=###\s*\[)/, '');
    const headerRegex = /###\s*\[(WhatsApp|Email|电话|WeChat|微信|whatsapp|email|phone|wechat)\]\s*(.*)/gi;
    const headers: Array<{ index: number; type: string; title: string; raw: string }> = [];
    let match;
    while ((match = headerRegex.exec(cleaned)) !== null) {
      headers.push({ index: match.index, type: normalizeType(match[1]), title: match[2].trim() || '话术', raw: match[0] });
    }
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const startPos = h.index + h.raw.length;
      const endPos = i + 1 < headers.length ? headers[i + 1].index : cleaned.length;
      const content = cleaned.substring(startPos, endPos).replace(/^[-–—]{2,}\s*\n?/gm, '').trim();
      if (content) scripts.push({ type: h.type, title: h.title, content });
    }
    if (scripts.length > 0) return scripts;
  }

  // 格式3：按 --- 分割后逐段简单解析
  const blocks = cleaned.split(/\n[-–—]{2,}\n|\n\*{2,}\n/).map(b => b.trim()).filter(b => b.length > 10);
  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length < 1) continue;
    const firstLine = lines[0].trim();
    let type = 'email';
    let title = '话術';
    const typePatterns = [
      /\[(WhatsApp|Email|电话|WeChat|微信)\]\s*(.+)/i,
      /【(WhatsApp|Email|电话|WeChat|微信)】\s*(.+)/i,
      /^(WhatsApp|Email|电话|WeChat|微信)\s*[-–—:：]\s*(.+)/i,
    ];
    let matched = false;
    for (const p of typePatterns) {
      const m = firstLine.match(p);
      if (m) { type = normalizeType(m[1]); title = m[2]?.trim() || '话術'; matched = true; break; }
    }
    if (!matched) {
      title = firstLine.replace(/^#{1,4}\s*/, '').trim() || '话術';
      const ft = lines.join(' ');
      if (/whatsapp/i.test(ft)) type = 'whatsapp';
      else if (/邮件|email/i.test(ft)) type = 'email';
      else if (/电话|phone/i.test(ft)) type = 'phone';
    }
    const content = lines.slice(1).join('\n').trim();
    if (content) scripts.push({ type, title, content });
  }

  return scripts;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, text } = body;
    
    if (!customerId) {
      return NextResponse.json({ success: false, error: '请选择目标客户' }, { status: 400 });
    }
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: '请粘贴或上传AI生成的文本内容' }, { status: 400 });
    }

    const scripts = parseScriptsFromMarkdown(text);
    
    if (scripts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '未能解析话术内容',
        hint: '请使用 === 新增话术 === 格式，每条包含 type/title/content',
        debugSample: text.substring(0, 300).replace(/\n/g, '\\n'),
      }, { status: 400 });
    }

    const results = [];
    for (const script of scripts) {
      try {
        const created = await prisma.followUpScript.create({
          data: { customerId, type: script.type, title: script.title, content: script.content },
        });
        results.push({ status: 'created', type: script.type, title: script.title, id: created.id });
      } catch (e: any) {
        results.push({ status: 'failed', type: script.type, title: script.title, error: e.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功导入 ${results.filter(r => r.status === 'created').length}/${scripts.length} 条话术`,
      total: scripts.length,
      created: results.filter(r => r.status === 'created').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  }
}
