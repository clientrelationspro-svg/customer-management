import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 提取键值对
function extractKeyValue(line: string): { key: string; value: string } | null {
  const commentIdx = line.indexOf('  #');
  const clean = commentIdx > 0 ? line.slice(0, commentIdx) : line;
  const match = clean.match(/^([\w]+)\s*:\s*(.+)$/);
  if (!match) return null;
  const key = match[1].trim();
  let value = match[2].trim();
  value = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return { key, value };
}

// 解析整段文本
function parseContent(text: string): { followUps: any[]; scripts: any[] } {
  const followUps: any[] = [];
  const scripts: any[] = [];

  const lines = text.split(/\r?\n/);
  let section: 'none' | 'followup' | 'scripts' = 'none';
  let currentFU: any = {};
  let currentScript: any = null;
  let inContent = false;
  let contentBuf: string[] = [];

  function saveScript() {
    if (currentScript && currentScript.type && currentScript.title && currentScript.content) {
      scripts.push({ ...currentScript });
    }
    currentScript = null;
    inContent = false;
    contentBuf = [];
  }

  function saveFollowUp() {
    if (currentFU && Object.keys(currentFU).length > 0) {
      followUps.push({ ...currentFU });
    }
    currentFU = {};
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // ── 章节标记 ──
    if (line.includes('新增跟进') || line === '=== 跟进 ===' || /^={3,}\s*跟进/.test(line)) {
      saveFollowUp();
      section = 'followup';
      continue;
    }

    if (line.includes('新增话术') || line === '=== 话术 ===' || /^={3,}\s*话术/.test(line)) {
      saveScript();
      section = 'scripts';
      continue;
    }

    // ── 多行 content 模式 ──
    if (inContent) {
      // 检测新话术开始：下一行的 type: "xxx"（缩进为0）
      const nextTypeMatch = line.match(/^type\s*:\s*"(whatsapp|email|phone)"/);
      const isBoundary = line.startsWith('===') || line.startsWith('---') || /^type\s*:\s*"/.test(line);

      if (isBoundary || nextTypeMatch) {
        // 结束当前多行 content
        if (currentScript) {
          currentScript.content = contentBuf.join('\n').trimEnd();
        }
        inContent = false;
        contentBuf = [];

        // 如果这是下一个话术的 type 行，保存当前并开始新的
        if (nextTypeMatch) {
          saveScript();
          currentScript = { type: nextTypeMatch[1] };
          section = 'scripts';
          continue;
        }
        // 如果是章节标记，保存话术
        if (line.includes('新增跟进')) {
          saveScript();
          saveFollowUp();
          section = 'followup';
          continue;
        }
        if (line.includes('新增话术')) {
          saveScript();
          section = 'scripts';
          continue;
        }
      } else {
        contentBuf.push(raw);
        continue;
      }
    }

    // 跳过空行和注释
    if (!line || line.startsWith('#')) continue;

    // ── 检测新话术 type 行 ──
    const typeMatch = line.match(/^type\s*:\s*"(whatsapp|email|phone)"/);
    if (typeMatch && section === 'scripts') {
      saveScript();
      currentScript = { type: typeMatch[1] };
      continue;
    }

    // ── 提取键值对 ──
    const kv = extractKeyValue(line);
    if (!kv) continue;
    const { key, value } = kv;

    // ── content: | 多行模式 ──
    if (key === 'content' && (value === '|' || value === '>')) {
      inContent = true;
      contentBuf = [];
      continue;
    }

    // ── 跟进字段 ──
    if (section === 'followup') {
      const m: Record<string, string> = {
        phone: 'phone', whatsapp: 'whatsapp', email: 'email',
        followUpMatters: 'followUpMatters', follow_up_matters: 'followUpMatters',
        contactMethod: 'contactMethod', contact_method: 'contactMethod',
        nextAction: 'nextAction', next_action: 'nextAction',
        priority: 'priority', status: 'status',
        lastFollowUpDate: 'lastFollowUpDate', last_follow_up_date: 'lastFollowUpDate',
        nextFollowUpDate: 'nextFollowUpDate', next_follow_up_date: 'nextFollowUpDate',
        remarks: 'remarks',
      };
      const mk = m[key];
      if (mk && value) currentFU[mk] = value;
    }

    // ── 话术字段 ──
    if (section === 'scripts' && currentScript) {
      const m: Record<string, string> = {
        type: 'type', title: 'title',
        nextFollowUpDate: 'nextFollowUpDate', next_follow_up_date: 'nextFollowUpDate',
      };
      const mk = m[key];
      if (mk && key !== 'content' && key !== 'type' && value) {
        currentScript[mk] = value;
      }
      // content 非多行（单行值）
      if (key === 'content' && value && value !== '|' && value !== '>') {
        currentScript.content = value;
      }
    }
  }

  // 收尾
  if (inContent && currentScript) {
    currentScript.content = contentBuf.join('\n').trimEnd();
  }
  saveScript();
  saveFollowUp();

  // 如果解析到了 scripts 但没在正确的 section，尝试从 followUp 中提取
  // (AI 有时会把所有内容放在一个 yaml 块里)

  return { followUps, scripts };
}

// ── API 主逻辑 ──
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string;

    if (!file) return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    if (!customerId) return NextResponse.json({ error: '请选择目标客户' }, { status: 400 });

    const customers = await prisma.$queryRaw<any[]>`
      SELECT id, company_name FROM customers WHERE id = ${customerId} LIMIT 1
    `;
    if (!customers[0]) return NextResponse.json({ error: '客户不存在' }, { status: 400 });

    const text = await file.text();
    console.log('=== Parsing file ===');
    console.log(text.substring(0, 300));

    const { followUps, scripts } = parseContent(text);

    console.log(`Result: ${followUps.length} follow-ups, ${scripts.length} scripts`);
    scripts.forEach((s, i) => console.log(`  Script ${i + 1}: [${s.type}] ${s.title}`));

    if (followUps.length === 0 && scripts.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未能识别有效内容。请确保文件包含 === 新增跟进 === 或 === 新增话术 === 标记',
        hint: 'AI 生成的文本需要包含这些标记，系统会自动提取内容',
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results: any[] = [];

    // 创建跟进记录
    for (const fu of followUps) {
      let lastDateStr: string;
      try { lastDateStr = new Date(fu.lastFollowUpDate || now).toISOString(); } catch { lastDateStr = now; }
      let nextDateStr: string | null = null;
      try { if (fu.nextFollowUpDate) nextDateStr = new Date(fu.nextFollowUpDate).toISOString(); } catch { nextDateStr = null; }

      const fid = `fup_im_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await prisma.$executeRaw`
        INSERT INTO follow_ups (id, customer_id, phone, whatsapp, email, follow_up_matters, contact_method, next_action, priority, status, last_follow_up_date, next_follow_up_date, remarks, created_at, updated_at)
        VALUES (${fid}, ${customerId}, ${fu.phone || null}, ${fu.whatsapp || null}, ${fu.email || null}, ${fu.followUpMatters || ''}, ${fu.contactMethod || 'other'}, ${fu.nextAction || null}, ${fu.priority || 'medium'}, ${fu.status || 'in_progress'}, ${lastDateStr}, ${nextDateStr}, ${fu.remarks || null}, ${now}, ${now})
      `;
      results.push({ type: 'followUp', status: 'created' });
    }

    // 创建话术
    for (const s of scripts) {
      if (!s.title || !s.content) continue;
      const sid = `script_im_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await prisma.$executeRaw`
        INSERT INTO follow_up_scripts (id, customer_id, type, title, content, next_follow_up_date, created_at, updated_at)
        VALUES (${sid}, ${customerId}, ${s.type}, ${s.title}, ${s.content.trimEnd()}, ${s.nextFollowUpDate || null}, ${now}, ${now})
      `;
      results.push({ type: 'script', title: s.title, status: 'created' });
    }

    const ok = results.filter(r => r.status === 'created');
    const err = results.filter(r => r.status === 'error');

    return NextResponse.json({
      success: err.length === 0,
      message: `成功创建 ${ok.length} 条记录` + (err.length > 0 ? `，${err.length} 条失败` : ''),
      total: results.length, created: ok.length, errors: err.length,
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: '导入失败：' + (error as Error).message }, { status: 500 });
  }
}
