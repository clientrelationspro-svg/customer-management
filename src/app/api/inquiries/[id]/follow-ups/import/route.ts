import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// 解析 WorkBuddy 输出格式
function parseSequence(text: string): { subject: string; body: string; scheduledAt: string }[] {
  const result: { subject: string; body: string; scheduledAt: string }[] = [];

  // 按 "--- 第N封 ---" 分割
  const blocks = text.split(/---\s*第\d+封\s*---/i);

  for (const block of blocks) {
    if (!block.trim()) continue;

    // 提取 subject: "xxx"
    const subjMatch = block.match(/subject:\s*"([^"]*)"/i);
    const subject = subjMatch?.[1] || '';

    // 提取 scheduledAt: "xxx"
    const timeMatch = block.match(/scheduledAt:\s*"([^"]*)"/i);
    const scheduledAt = timeMatch?.[1] || '';

    // 提取 content: | 后面的内容（直到下一个 --- 或 subject: 或文件末尾）
    const contentIdx = block.indexOf('content:');
    if (contentIdx === -1) continue;

    const afterContent = block.slice(contentIdx);
    // 移除 "content: |" 行
    const bodyLines = afterContent.split('\n').slice(1);
    // 收集内容直到遇到 --- 或下一个 subject:
    const cleanLines: string[] = [];
    for (const line of bodyLines) {
      if (line.match(/^subject:/i) || line.match(/^---/)) break;
      cleanLines.push(line);
    }
    const body = cleanLines.join('\n').trim();

    if (subject && body && scheduledAt) {
      result.push({ subject, body, scheduledAt });
    }
  }

  return result;
}

// POST: 导入序列
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json({ success: false, error: '内容为空' });
    }

    const emails = parseSequence(text);
    if (emails.length === 0) {
      return NextResponse.json({ success: false, error: '未识别到有效的邮件格式' });
    }

    let count = 0;
    for (const email of emails) {
      try {
        await prisma.scheduledFollowUp.create({
          data: {
            inquiryId: params.id,
            subject: email.subject,
            body: email.body,
            scheduledAt: new Date(email.scheduledAt),
            status: 'pending',
          },
        });
        count++;
      } catch (e) {
        console.error('Error creating follow-up:', e);
      }
    }

    return NextResponse.json({ success: true, count, message: `成功导入 ${count} 封定时邮件` });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: '导入失败' });
  }
}
