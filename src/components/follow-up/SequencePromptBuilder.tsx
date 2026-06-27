'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Download, Upload, X, ChevronDown, ChevronUp, Loader2, Trash2, Settings2, Mail, FileText, Target, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DataItem { id: string; source: string; label: string; content: string; date?: string; }
interface Props { customerId?: string; inquirySubject?: string; inquiryBody?: string; inquiryId?: string; onImport?: () => void; }

const STRATEGIES = [
  { key: 'new_inquiry', label: '新询价跟进', desc: '感谢→报价→确认', role: 'seller', count: 3, interval: 3, tone: 'professional' },
  { key: 'quote_followup', label: '报价催单', desc: '提醒→限时优惠', role: 'seller', count: 2, interval: 2, tone: 'urgent' },
  { key: 'reactivation', label: '沉寂再激活', desc: '关怀→新品推荐', role: 'seller', count: 2, interval: 5, tone: 'friendly' },
  { key: 'payment', label: '付款提醒', desc: '提醒→通知→通牒', role: 'seller', count: 3, interval: 7, tone: 'professional' },
  { key: 'buyer', label: '采购询价', desc: '询价→报价请求', role: 'buyer', count: 2, interval: 3, tone: 'professional' },
  { key: 'middleman', label: '中间商撮合', desc: '介绍→对接', role: 'middleman', count: 2, interval: 3, tone: 'friendly' },
];

const FIXED_FORMAT_HINT = `--- 第N封 ---
subject: "邮件主题"
scheduledAt: "2026-07-01 09:00"
content: |
  Markdown正文（段落用空行分隔）
  - 支持列表
  **支持粗体**`;

export default function SequencePromptBuilder({ customerId, inquirySubject, inquiryBody, inquiryId, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'build' | 'import'>('build');
  const [loading, setLoading] = useState(false);

  // 策略 + 参数
  const [strategy, setStrategy] = useState('new_inquiry');
  const [role, setRole] = useState('seller');
  const [count, setCount] = useState(3);
  const [words, setWords] = useState(150);
  const [interval, setInterval] = useState(3);
  const [tone, setTone] = useState('professional');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  // 数据条目
  const [items, setItems] = useState<DataItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeEmail, setIncludeEmail] = useState(true);
  const [planData, setPlanData] = useState<any>(null);

  // Prompt
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Import
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');

  useEffect(() => { if (open && customerId) loadData(); }, [open, customerId]);

  const applyStrategy = (key: string) => {
    setStrategy(key);
    const s = STRATEGIES.find(s => s.key === key);
    if (s) { setRole(s.role); setCount(s.count); setInterval(s.interval); setTone(s.tone); }
  };

  const loadData = async () => {
    setLoading(true);
    const all: DataItem[] = [];
    let nextDate = '';
    try {
      const r = await fetch(`/api/customers/${customerId}`);
      const d = await r.json();
      if (d.success && d.data.notes) all.push({ id: 'cust-notes', source: 'customer', label: '客户备注', content: d.data.notes });
      if (d.success && d.data.contacts?.length) {
        d.data.contacts.slice(0, 3).forEach((c: any) => {
          all.push({ id: `cust-contact-${c.id}`, source: 'customer', label: `联系人: ${c.name}`, content: `${c.name}${c.position ? ` (${c.position})` : ''}${c.email ? ` ${c.email}` : ''}${c.whatsapp ? ` WA:${c.whatsapp}` : ''}` });
        });
      }
    } catch {}

    // 加载跟进记录，提取下次跟进时间
    try {
      const r = await fetch(`/api/follow-ups?customerId=${customerId}&limit=10`);
      const d = await r.json();
      if (d.success && d.data) {
        d.data.forEach((f: any) => {
          if (f.remarks) {
            const date = f.lastFollowUpDate ? new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN') : '';
            all.push({ id: `fu-${f.id}`, source: 'followup', label: `开发备注 ${date}`, content: f.remarks, date });
          }
          // 获取最近的 nextFollowUpDate
          if (f.nextFollowUpDate) {
            const nd = new Date(f.nextFollowUpDate);
            if (!nextDate || nd > new Date(nextDate)) nextDate = f.nextFollowUpDate;
          }
        });
      }
    } catch {}

    // 设置起始日期：优先用最近的 nextFollowUpDate，其次明天
    if (nextDate) {
      const d = new Date(nextDate);
      if (d < new Date()) {
        // 如果已过期，用明天
        const t = new Date(); t.setDate(t.getDate() + 1);
        setStartDate(t.toISOString().split('T')[0]);
      } else {
        setStartDate(d.toISOString().split('T')[0]);
      }
    } else {
      const t = new Date(); t.setDate(t.getDate() + 1);
      setStartDate(t.toISOString().split('T')[0]);
    }

    try {
      const r = await fetch(`/api/needs-analysis?customerId=${customerId}`);
      const d = await r.json();
      if (d.success && d.data) d.data.forEach((n: any) => {
        const cat = n.category === 'product_requirement' ? '产品需求' : n.category === 'cooperation_angle' ? '合作切入点' : '钩子信息';
        all.push({ id: `need-${n.id}`, source: 'need', label: cat, content: n.content });
      });
    } catch {}
    try {
      const pr = await fetch(`/api/development-plans?customerId=${customerId}`);
      const pd = await pr.json();
      if (pd.success && pd.data) setPlanData(pd.data);
    } catch {}
    setItems(all);
    setSelected(new Set(all.map(i => i.id)));
    setLoading(false);
  };

  const toggle = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const buildPrompt = () => {
    const roleLabels: Record<string, string> = { seller: '供应商/卖家', buyer: '采购商/买家', middleman: '中间商/代理商' };
    const toneLabels: Record<string, string> = { professional: '专业正式', friendly: '友好亲切', urgent: '紧迫有力' };
    const perspectives: Record<string, string> = { seller: '以供应商身份推销产品，强调优势和价值', buyer: '以采购商身份询价，体现专业需求', middleman: '以中间商身份撮合双方，强调对接能力' };

    const sel = items.filter(i => selected.has(i.id));
    let dataBlock = '';

    // 下次跟进时间（关键数据）
    if (startDate) {
      dataBlock += `\n### ⏰ 下次跟进\n起始日期: ${startDate}（每封邮件间隔 ${interval} 天）\n`;
    }

    // 开发方案
    if (planData) {
      const steps = JSON.parse(planData.steps || '[]');
      const pending = steps.filter((s: any) => !s.done);
      dataBlock += `\n### 📋 开发方案\n`;
      dataBlock += `目标: ${planData.goal || ''}\n`;
      dataBlock += `阶段: ${planData.stage || ''}\n`;
      if (planData.lastQuote) dataBlock += `最新报价: ${planData.lastQuote}\n`;
      if (pending.length > 0) {
        dataBlock += `待执行步骤:\n${pending.map((s: any) => `- ${s.text}${s.dueDate ? ` (截止: ${s.dueDate})` : ''}`).join('\n')}\n`;
      }
    }

    if (sel.length) {
      ['customer', 'followup', 'need'].forEach(src => {
        const g = sel.filter(i => i.source === src);
        if (!g.length) return;
        const title = src === 'customer' ? '客户信息' : src === 'followup' ? '开发备注' : '需求分析';
        dataBlock += `\n### ${title}\n` + g.map(i => i.content.slice(0, 500)).join('\n\n') + '\n';
      });
    }

    const emailBlock = includeEmail && inquirySubject ? `\n## 📧 当前邮件\n主题: ${inquirySubject}\n内容: ${(inquiryBody || '').slice(0, 1500)}\n` : '';

    // 计算每封邮件的日期
    const dateList: string[] = [];
    if (startDate) {
      const base = new Date(startDate);
      for (let i = 0; i < count; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i * interval);
        dateList.push(d.toISOString().split('T')[0]);
      }
    }

    const dateBlock = dateList.length > 0
      ? `\n### 📅 每封邮件日期（已计算）\n${dateList.map((d, i) => `第${i + 1}封: ${d} 09:00`).join('\n')}\n`
      : '';

    const p = `你是资深外贸业务专家，以 **${roleLabels[role]}** 身份生成定时跟进邮件序列。

${dataBlock}${emailBlock}${dateBlock}

## ⚙️ 参数
- 邮件数: ${count} 封 | 每封约 ${words} 字 | 间隔 ${interval} 天
- 角色: ${roleLabels[role]} — ${perspectives[role]}
- 语气: ${toneLabels[tone]}
${name ? `- 序列名称: ${name}` : ''}

## 📐 固定输出格式（严格遵循，用于自动导入解析）
每组邮件按以下格式输出，字段顺序固定，scheduledAt 使用上方计算好的日期：

\`\`\`
--- 第1封 ---
subject: "邮件主题"
scheduledAt: "${dateList[0] || 'YYYY-MM-DD'} 09:00"
content: |
  Markdown格式正文，段落用空行分隔
  第二段内容...

--- 第2封 ---
subject: "邮件主题"
scheduledAt: "${dateList[1] || 'YYYY-MM-DD'} 09:00"
content: |
  第一段...
  第二段...

...共${count}封
\`\`\`

输出规则:
1. subject/scheduledAt/content 三字段必须存在，字段名严格小写
2. scheduledAt 格式固定为 "YYYY-MM-DD HH:MM"
3. content 为 Markdown 格式，段落间用空行分隔
4. 每封邮件之间用 "--- 第N封 ---" 分隔
5. 不要输出代码块标记(\`\`\`)或其他解释文字`;

    setPrompt(p);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const r = await fetch(`/api/inquiries/${inquiryId}/follow-ups/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, customerId }),
      });
      const d = await r.json();
      if (d.success) {
        setImportResult(`✅ 已导入 ${d.count} 封定时邮件`);
        setImportText('');
        onImport?.();
      } else {
        setImportResult(`❌ ${d.error || '导入失败'}`);
      }
    } catch { setImportResult('导入失败'); }
    finally { setImporting(false); }
  };

  const sourceIcon = (s: string) => s === 'customer' ? <BookOpen className="w-3 h-3" /> : s === 'followup' ? <FileText className="w-3 h-3" /> : <Target className="w-3 h-3" />;

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} className="text-purple-600 hover:bg-purple-50">
        <Sparkles className="w-3 h-3 mr-1" />{open ? '收起面板' : 'Prompt 生成序列'}
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </Button>

      {open && (
        <div className="mt-2 border border-purple-200 rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button onClick={() => setTab('build')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${tab === 'build' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <Settings2 className="w-3.5 h-3.5" />生成 Prompt
            </button>
            <button onClick={() => setTab('import')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${tab === 'import' ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <Upload className="w-3.5 h-3.5" />导入序列
            </button>
          </div>

          {tab === 'build' ? (
            <div className="p-4 space-y-4">
              {/* 下次跟进时间 */}
              {startDate && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>下次跟进起始日期:</strong> {startDate}
                  </span>
                  <span className="text-xs text-blue-500 ml-auto">
                    每 {interval} 天一封，共 {count} 封
                  </span>
                </div>
              )}

              {/* Step 1: 策略 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">策略模板</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {STRATEGIES.map(s => (
                    <button key={s.key} onClick={() => applyStrategy(s.key)}
                      className={`text-left px-3 py-1.5 rounded-lg text-xs transition-all ${strategy === s.key ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-gray-400 text-[10px]">{s.desc} · {s.count}封/{s.interval}天</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: 参数 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">参数调整</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={role} onChange={e => { setRole(e.target.value); setStrategy('new_inquiry'); }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white">
                    <option value="seller">供应商</option><option value="buyer">采购商</option><option value="middleman">中间商</option>
                  </select>
                  <span className="text-xs text-gray-400">·</span>
                  <select value={tone} onChange={e => { setTone(e.target.value); setStrategy('new_inquiry'); }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white">
                    <option value="professional">专业正式</option><option value="friendly">友好亲切</option><option value="urgent">紧迫有力</option>
                  </select>
                  <span className="text-xs text-gray-400">·</span>
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <button onClick={() => setCount(c => Math.max(1, c-1))} className="text-gray-400 hover:text-gray-600 text-xs">−</button>
                    <span className="text-sm font-bold w-6 text-center">{count}</span>
                    <button onClick={() => setCount(c => Math.min(10, c+1))} className="text-gray-400 hover:text-gray-600 text-xs">+</button>
                    <span className="text-[10px] text-gray-400 ml-1">封</span>
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <button onClick={() => setInterval(c => Math.max(1, c-1))} className="text-gray-400 hover:text-gray-600 text-xs">−</button>
                    <span className="text-sm font-bold w-6 text-center">{interval}</span>
                    <button onClick={() => setInterval(c => Math.min(30, c+1))} className="text-gray-400 hover:text-gray-600 text-xs">+</button>
                    <span className="text-[10px] text-gray-400 ml-1">天</span>
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <input type="number" value={words} onChange={e => setWords(Number(e.target.value))} className="w-14 px-1.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-center" />
                  <span className="text-[10px] text-gray-400">字/封</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" title="起始日期" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="序列名称 (可选)" className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={includeEmail} onChange={e => setIncludeEmail(e.target.checked)} className="rounded" />含当前邮件
                  </label>
                </div>
              </div>

              {/* Step 3: 数据条目 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">注入数据 ({selected.size}/{items.length})</p>
                  {items.length > 0 && (
                    <div className="flex gap-2 text-[10px]">
                      <button onClick={() => setSelected(new Set(items.map(i => i.id)))} className="text-blue-600 hover:underline">全选</button>
                      <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:underline">清空</button>
                    </div>
                  )}
                </div>
                {loading ? (
                  <div className="text-xs text-gray-400 flex items-center gap-1 py-2"><Loader2 className="w-3 h-3 animate-spin" />加载中...</div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">暂无可选数据</p>
                ) : (
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {items.map(i => (
                      <label key={i.id} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selected.has(i.id) ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                        <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="rounded mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5">
                            {sourceIcon(i.source)}
                            <span className="font-medium">{i.label}</span>
                            {i.date && <span className="text-gray-300">· {i.date}</span>}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{i.content}</p>
                        </div>
                        {selected.has(i.id) && <span className="text-purple-500 text-[10px] flex-shrink-0">已选</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 4: 生成 */}
              <div className="flex gap-2">
                <Button size="sm" onClick={buildPrompt} className="bg-purple-600 hover:bg-purple-700"><Sparkles className="w-3 h-3 mr-1" />生成</Button>
                {prompt && (<>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-gray-600"><Copy className="w-3 h-3 mr-1" />{copied ? '已复制' : '复制'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { const b = new Blob([prompt], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='prompt.txt'; a.click(); }} className="text-gray-600"><Download className="w-3 h-3 mr-1" />下载</Button>
                </>)}
              </div>

              {prompt && (
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  rows={14} className="w-full px-3 py-2 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono resize-y border-0 focus:ring-2 focus:ring-purple-500" />
              )}
            </div>
          ) : (
            /* Import Tab */
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-0.5">粘贴 AI 生成的定时序列，自动识别并导入</p>
                  <p className="text-blue-500">支持格式: <code className="bg-blue-100 px-1 rounded">--- 第N封 ---</code> + <code className="bg-blue-100 px-1 rounded">subject:</code> + <code className="bg-blue-100 px-1 rounded">scheduledAt:</code> + <code className="bg-blue-100 px-1 rounded">content:</code></p>
                </div>
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono resize-y focus:ring-2 focus:ring-purple-500"
                placeholder={FIXED_FORMAT_HINT} />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleImport} loading={importing}><Upload className="w-3 h-3 mr-1" />导入到定时列表</Button>
                {importResult && <span className={`text-xs ${importResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{importResult}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
