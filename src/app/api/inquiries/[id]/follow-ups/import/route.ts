import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// 解析多种可能的日期格式
function parseDate(str: string): Date | null {
  if (!str) return null;
  const cleaned = str.trim().replace(/["']/g, '');
  // 尝试标准格式 YYYY-MM-DD HH:MM
  const match1 = cleaned.match(/(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})?/);
  if (match1) {
    const dateStr = match1[2] ? cleaned : match1[1] + ' 09:00';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // 尝试 YYYY/MM/DD
  const match2 = cleaned.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (match2) {
    const d = new Date(`${match2[1]}-${match2[2]}-${match2[3]}T09:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// 解析定时序列文本
function parseSequence(text: string): { subject: string; body: string; scheduledAt: Date }[] {
  const result: { subject: string; body: string; scheduledAt: Date }[] = [];

  // 先清理文本：移除代码块标记
  let cleaned = text
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/```/g, '')            // 移除残留的 ```
    .trim();

  // 按 "--- 第N封 ---" 或 "--- 第N封" 或 "第N封:" 分割
  const blocks = cleaned.split(/---\s*第\s*\d+\s*封\s*---|---\s*第\s*\d+\s*封|第\s*\d+\s*封[：:]/i);

  // 如果分割后只有一个块，尝试用 /---/ 分割
  const effectiveBlocks = blocks.length > 1 ? blocks : cleaned.split(/---+/);

  for (const block of effectiveBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 10) continue;

    // === 提取 subject ===
    let subject = '';
    const subjMatch = trimmed.match(/subject\s*[:：]\s*"([^"]*)"/i);
    if (subjMatch) {
      subject = subjMatch[1].trim();
    } else {
      // 无引号版本
      const subjMatch2 = trimmed.match(/subject\s*[:：]\s*(.+?)(?:\n|$)/i);
      if (subjMatch2) subject = subjMatch2[1].trim();
    }

    // === 提取 scheduledAt ===
    let scheduledAt: Date | null = null;
    const timeMatch = trimmed.match(/scheduledAt\s*[:：]\s*"([^"]*)"/i);
    if (timeMatch) {
      scheduledAt = parseDate(timeMatch[1]);
    } else {
      const timeMatch2 = trimmed.match(/scheduledAt\s*[:：]\s*(.+?)(?:\n|$)/i);
      if (timeMatch2) scheduledAt = parseDate(timeMatch2[1].trim());
    }

    // === 提取 content ===
    let body = '';
    const contentIdx = trimmed.search(/content\s*[:：]\s*\|?/i);
    if (contentIdx !== -1) {
      const afterContent = trimmed.slice(contentIdx);
      // 跳过 "content: |" 或 "content:" 行
      const bodyLines = afterContent.split('\n').slice(1);
      const cleanLines: string[] = [];
      for (const line of bodyLines) {
        if (/^(subject|scheduledAt)\s*[:：]/i.test(line)) break;
        if (/^---/.test(line)) break;
        cleanLines.push(line);
      }
      body = cleanLines.join('\n').trim();
    }

    if (subject && body && scheduledAt) {
      result.push({ subject, body, scheduledAt });
    } else if (subject && body && !scheduledAt) {
      // 没有日期的，默认明天早上9点
      const t = new Date();
      t.setDate(t.getDate() + 1);
      t.setHours(9, 0, 0, 0);
      result.push({ subject, body, scheduledAt: t });
    }
  }

  return result;
}

// POST: 导入序列
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { text, customerId } = body;

    if (!text?.trim()) {
      return NextResponse.json({ success: false, error: '内容为空，请粘贴 AI 生成的定时序列' });
    }

    const emails = parseSequence(text);
    if (emails.length === 0) {
      return NextResponse.json({
        success: false,
        error: `未识别到有效格式。请确保包含 subject:/scheduledAt:/content: 字段，格式参考:\n${FIXED_FORMAT_EXAMPLE}`,
      });
    }

    let count = 0;
    const errors: string[] = [];
    for (const email of emails) {
      try {
        await prisma.scheduledFollowUp.create({
          data: {
            inquiryId: params.id,
            customerId: customerId || null,
            subject: email.subject,
            body: email.body,
            scheduledAt: email.scheduledAt,
            status: 'pending',
          },
        });
        count++;
      } catch (e: any) {
        errors.push(e?.message || '未知错误');
      }
    }

    if (count === 0) {
      return NextResponse.json({
        success: false,
        error: `导入失败: ${errors[0] || '数据库写入错误'}`,
      });
    }

    return NextResponse.json({
      success: true,
      count,
      message: `成功导入 ${count} 封定时邮件${errors.length ? `，${errors.length} 封失败` : ''}`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: '导入失败，请检查格式' });
  }
}

const FIXED_FORMAT_EXAMPLE = `--- 第1封 ---
subject: "关于产品的回复"
scheduledAt: "2026-07-01 09:00"
content: |
  邮件正文第一段...

  邮件正文第二段...`;
