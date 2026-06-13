import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// 解析文本为跟进记录和话术
function parseContent(text: string): { followUps: any[]; scripts: any[] } {
  const followUps: any[] = [];
  const scripts: any[] = [];
  const lines = text.split(/\r?\n/);
  let section: 'none' | 'followup' | 'scripts' = 'none';
  let currentFU: any = {};
  let currentScript: any = null;
  let inContent = false;
  let contentBuf: string[] = [];

  function flushScript() {
    if (currentScript && currentScript.type && currentScript.title && currentScript.content) {
      scripts.push({ ...currentScript });
    }
    currentScript = null;
    inContent = false;
    contentBuf = [];
  }

  function flushFU() {
    if (currentFU && Object.keys(currentFU).length > 0) followUps.push({ ...currentFU });
    currentFU = {};
  }

  for (const raw of lines) {
    const line = raw.trim();

    if (/新增跟进|新增开发|===.*跟进|===.*开发/.test(line)) { flushFU(); section = 'followup'; continue; }
    if (/新增话术|新增开发话术|===.*话术/.test(line)) { flushScript(); section = 'scripts'; continue; }

    if (inContent) {
      const nextType = line.match(/^type\s*:\s*"(whatsapp|email|phone)"/);
      if (nextType || line.startsWith('===')) {
        if (currentScript) currentScript.content = contentBuf.join('\n').trimEnd();
        inContent = false; contentBuf = [];
        if (nextType) { flushScript(); currentScript = { type: nextType[1] }; section = 'scripts'; continue; }
        if (line.includes('跟进') || line.includes('开发')) { flushScript(); flushFU(); section = 'followup'; continue; }
        if (line.includes('话术')) { flushScript(); section = 'scripts'; continue; }
      } else {
        contentBuf.push(raw);
        continue;
      }
    }

    if (!line || line.startsWith('#')) continue;

    const typeMatch = line.match(/^type\s*:\s*"(whatsapp|email|phone)"/);
    if (typeMatch && section === 'scripts') { flushScript(); currentScript = { type: typeMatch[1] }; continue; }

    const kv = extractKeyValue(line);
    if (!kv) continue;
    const { key, value } = kv;

    if (key === 'content' && (value === '|' || value === '>')) { inContent = true; contentBuf = []; continue; }

    const fuMap: Record<string, string> = { phone:'phone', whatsapp:'whatsapp', email:'email', followUpMatters:'followUpMatters', follow_up_matters:'followUpMatters', contactMethod:'contactMethod', contact_method:'contactMethod', nextAction:'nextAction', next_action:'nextAction', priority:'priority', status:'status', lastFollowUpDate:'lastFollowUpDate', last_follow_up_date:'lastFollowUpDate', nextFollowUpDate:'nextFollowUpDate', next_follow_up_date:'nextFollowUpDate', remarks:'remarks' };

    if (section === 'followup') { const mk = fuMap[key]; if (mk && value) currentFU[mk] = value; }

    if (section === 'scripts' && currentScript) {
      const sm: Record<string, string> = { type:'type', title:'title', nextFollowUpDate:'nextFollowUpDate', next_follow_up_date:'nextFollowUpDate' };
      const mk = sm[key];
      if (mk && key !== 'content' && key !== 'type' && value) currentScript[mk] = value;
      if (key === 'content' && value && value !== '|' && value !== '>') currentScript.content = value;
    }
  }

  if (inContent && currentScript) currentScript.content = contentBuf.join('\n').trimEnd();
  flushScript();
  flushFU();

  return { followUps, scripts };
}

// POST - 支持文件上传和文本粘贴
export async function POST(request: NextRequest) {
  try {
    let text = '';
    let customerId = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      customerId = formData.get('customerId') as string;
      if (!file) return NextResponse.json({ error: '请上传文件' }, { status: 400 });
      text = await file.text();
    } else {
      const body = await request.json();
      text = body.text || '';
      customerId = body.customerId || '';
    }

    if (!text.trim()) return NextResponse.json({ error: '内容为空' }, { status: 400 });
    if (!customerId) return NextResponse.json({ error: '请选择目标客户' }, { status: 400 });

    const { followUps, scripts } = parseContent(text);

    if (followUps.length === 0 && scripts.length === 0) {
      return NextResponse.json({ success: false, error: '未识别有效内容' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results: any[] = [];

    for (const fu of followUps) {
      try {
        const matterStr = Array.isArray(fu.followUpMatters) ? fu.followUpMatters.join(',') : (fu.followUpMatters || '');
        await prisma.followUp.create({
          data: {
            customerId,
            phone: fu.phone || null,
            whatsapp: fu.whatsapp || null,
            email: fu.email || null,
            followUpMatters: matterStr,
            contactMethod: fu.contactMethod || 'other',
            nextAction: fu.nextAction || null,
            priority: fu.priority || 'medium',
            status: fu.status || 'in_progress',
            lastFollowUpDate: new Date(fu.lastFollowUpDate || now),
            nextFollowUpDate: fu.nextFollowUpDate ? new Date(fu.nextFollowUpDate) : null,
            remarks: fu.remarks || null,
          },
        });
        results.push({ type: 'followUp', status: 'created' });
      } catch (e) { results.push({ type: 'followUp', status: 'error', error: (e as Error).message }); }
    }

    for (const s of scripts) {
      if (!s.title || !s.content) continue;
      try {
        await prisma.followUpScript.create({
          data: {
            customerId,
            type: s.type,
            title: s.title,
            content: s.content.trimEnd(),
            nextFollowUpDate: s.nextFollowUpDate ? new Date(s.nextFollowUpDate) : null,
          },
        });
        results.push({ type: 'script', title: s.title, status: 'created' });
      } catch (e) { results.push({ type: 'script', title: s.title, status: 'error', error: (e as Error).message }); }
    }

    const ok = results.filter(r => r.status === 'created');
    const err = results.filter(r => r.status === 'error');

    return NextResponse.json({
      success: err.length === 0,
      message: `成功创建 ${ok.length} 条记录` + (err.length > 0 ? `，${err.length} 条失败` : ''),
      results,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  }
}
