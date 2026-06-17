'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Download, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  customerId?: string;
  inquirySubject?: string;
  inquiryBody?: string;
  inquiryId?: string;
  onImport?: () => void;
}

export default function SequencePromptBuilder({ customerId, inquirySubject, inquiryBody, inquiryId, onImport }: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 配置
  const [role, setRole] = useState('seller');
  const [emailCount, setEmailCount] = useState(3);
  const [wordsPerEmail, setWordsPerEmail] = useState(150);
  const [intervalDays, setIntervalDays] = useState(3);
  const [tone, setTone] = useState('professional');
  const [sequenceName, setSequenceName] = useState('');

  // 模块勾选
  const [modules, setModules] = useState({
    basicInfo: true,
    contacts: true,
    notes: true,
    recentEmails: true,
    followUps: true,
    customNotes: false,
  });
  const [customNotes, setCustomNotes] = useState('');

  // 客户数据
  const [customerData, setCustomerData] = useState<any>(null);
  const [customerContext, setCustomerContext] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // 导入
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');

  useEffect(() => {
    if (showBuilder && customerId) fetchCustomerData();
  }, [showBuilder, customerId]);

  const fetchCustomerData = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomerData(data.data);
        // 生成上下文
        let ctx = '';
        const c = data.data;
        if (c.companyName) ctx += `公司: ${c.companyName}\n`;
        if (c.country) ctx += `国家: ${c.country}\n`;
        if (c.industry) ctx += `行业: ${c.industry}\n`;
        if (c.level) ctx += `等级: ${c.level}级\n`;
        if (c.enterpriseScale) ctx += `规模: ${c.enterpriseScale}\n`;
        if (c.notes) ctx += `\n备注:\n${c.notes.slice(0, 500)}\n`;
        if (c.contacts?.length) {
          ctx += '\n联系人:\n' + c.contacts.map((con: any) => 
            `- ${con.name}${con.position ? ` (${con.position})` : ''}${con.email ? ` ${con.email}` : ''}${con.whatsapp ? ` WA:${con.whatsapp}` : ''}`
          ).join('\n') + '\n';
        }
        setCustomerContext(ctx);
      }
    } catch {}
  };

  const generatePrompt = async () => {
    let ctx = customerContext;

    // 动态添加近期邮件
    if (modules.recentEmails && inquirySubject) {
      ctx += `\n当前邮件主题: ${inquirySubject}\n`;
      ctx += `当前邮件内容: ${(inquiryBody || '').slice(0, 1000)}\n`;
    }

    // 动态添加跟进历史
    if (modules.followUps && customerId) {
      try {
        const res = await fetch(`/api/follow-ups?customerId=${customerId}&limit=5`);
        const data = await res.json();
        if (data.success && data.data?.length) {
          ctx += '\n最近跟进记录:\n' + data.data.map((f: any) =>
            `${new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN')} ${f.contactMethod || '其他'} ${f.nextAction || ''}`
          ).join('\n') + '\n';
        }
      } catch {}
    }

    // 自定义说明
    if (modules.customNotes && customNotes.trim()) {
      ctx += `\n自定义说明:\n${customNotes.trim()}\n`;
    }

    const roleLabel = role === 'seller' ? '供应商/卖家' : role === 'buyer' ? '采购商/买家' : '中间商/代理商';
    const rolePerspective = role === 'seller' ? '以供应商身份向客户推销产品，强调产品优势和合作价值' 
      : role === 'buyer' ? '以采购商身份向供应商询价，体现专业采购需求' 
      : '以中间商/代理商身份撮合双方，强调对接能力和资源整合';
    const toneLabel = tone === 'professional' ? '专业正式' : tone === 'friendly' ? '友好亲切' : '紧迫有力';

    const p = `你是一名资深外贸业务专家。请以${roleLabel}身份为以下客户生成定时跟进邮件序列。

## 客户信息
${modules.basicInfo ? ctx.split('\n').filter(l => !l.startsWith('备注') && !l.startsWith('联系人') && !l.startsWith('最近跟进') && !l.startsWith('当前邮件') && !l.startsWith('自定义')).join('\n') : ''}
${modules.contacts ? ctx.split('\n').filter(l => l.startsWith('联系人:') || l.startsWith('- ')).join('\n') : ''}
${modules.notes ? '\n' + ctx.split('\n').filter(l => l.startsWith('备注:') || (l.startsWith('- ') && ctx.indexOf('备注') < l.indexOf('联系人'))).join('\n') : ''}
${modules.recentEmails ? '\n' + ctx.split('\n').filter(l => l.startsWith('当前邮件')).join('\n') : ''}
${modules.followUps ? '\n' + ctx.split('\n').filter(l => l.startsWith('最近跟进')).join('\n') : ''}
${modules.customNotes && customNotes.trim() ? '\n' + ctx.split('\n').filter(l => l.startsWith('自定义说明')).join('\n') : ''}

## ⚙️ 生成参数
| 参数 | 要求 |
|------|------|
| 邮件数量 | **${emailCount} 封** |
| 每封字数 | **${wordsPerEmail} 字左右** |
| 发送间隔 | 每封间隔 **${intervalDays} 天**（从明天开始） |
| 用户角色 | **${roleLabel}** — ${rolePerspective} |
| 语气风格 | **${toneLabel}** |
${sequenceName ? `| 序列名称 | **${sequenceName}** |` : ''}

## 输出格式 - 严格遵守

\`\`\`
=== 定时序列 ===
客户: [公司名]
序列名称: ${sequenceName || '[策略名称]'}

--- 第1封 ---
subject: "[邮件主题]"
scheduledAt: "${new Date(Date.now() + 86400000).toISOString().split('T')[0]} 09:00"
content: |
  [Markdown格式正文，${wordsPerEmail}字左右]

--- 第2封 ---
subject: "[邮件主题]"
scheduledAt: "${new Date(Date.now() + (intervalDays + 1) * 86400000).toISOString().split('T')[0]} 09:00"
content: |
  [Markdown格式正文]
...
\`\`\`

禁止：多余解释、编号前缀、代码块标记`;

    setPrompt(p);
  };

  // 导入序列
  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/follow-ups/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(`✅ 成功导入 ${data.count} 封定时邮件`);
        setImportText('');
        onImport?.();
      } else {
        setImportResult(`❌ ${data.error || '导入失败'}`);
      }
    } catch {
      setImportResult('导入失败');
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={() => setShowBuilder(!showBuilder)}>
        <Sparkles className="w-3 h-3 mr-1" />{showBuilder ? '收起' : 'Prompt 生成序列'} {showBuilder ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {showBuilder && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-4 space-y-3">
          {/* 基础设置 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-500">角色</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="form-input text-xs">
                <option value="seller">供应商</option><option value="buyer">采购商</option><option value="middleman">中间商</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">邮件数量</label>
              <div className="flex items-center gap-1">
                <button onClick={() => setEmailCount(c => Math.max(1, c-1))} className="w-6 h-6 rounded bg-white border text-xs">−</button>
                <span className="text-sm font-bold w-6 text-center">{emailCount}</span>
                <button onClick={() => setEmailCount(c => Math.min(10, c+1))} className="w-6 h-6 rounded bg-white border text-xs">+</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">每封字数</label>
              <input type="number" value={wordsPerEmail} onChange={e => setWordsPerEmail(Number(e.target.value))} className="form-input text-xs" min={50} max={500} />
            </div>
            <div>
              <label className="text-xs text-gray-500">间隔天数</label>
              <input type="number" value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} className="form-input text-xs" min={1} max={30} />
            </div>
          </div>

          {/* 高级设置 */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            高级设置
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">语气</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className="form-input text-xs">
                  <option value="professional">专业正式</option><option value="friendly">友好亲切</option><option value="urgent">紧迫有力</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">序列名称</label>
                <input type="text" value={sequenceName} onChange={e => setSequenceName(e.target.value)} className="form-input text-xs" placeholder="如: 铜管询价跟进" />
              </div>
            </div>
          )}

          {/* 模块勾选 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">数据模块</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'basicInfo', label: '基本信息' },
                { key: 'contacts', label: '联系人' },
                { key: 'notes', label: '备注洞察' },
                { key: 'recentEmails', label: '邮件往来' },
                { key: 'followUps', label: '跟进历史' },
                { key: 'customNotes', label: '自定义' },
              ].map(m => (
                <label key={m.key} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={(modules as any)[m.key]} onChange={e => setModules(prev => ({...prev, [m.key]: e.target.checked}))} className="rounded" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {modules.customNotes && (
            <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)}
              rows={2} className="form-input text-xs" placeholder="自定义补充说明..." />
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={generatePrompt} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-3 h-3 mr-1" />生成 Prompt
            </Button>
            {prompt && (
              <>
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  <Copy className="w-3 h-3 mr-1" />{copied ? '已复制' : '复制'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { const b = new Blob([prompt], {type: 'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`sequence-prompt-${customerId}.txt`; a.click(); }}>
                  <Download className="w-3 h-3 mr-1" />下载
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowImport(!showImport)}>
                  <Upload className="w-3 h-3 mr-1" />导入
                </Button>
              </>
            )}
          </div>

          {prompt && (
            <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono max-h-[250px] overflow-y-auto whitespace-pre-wrap">{prompt}</pre>
          )}

          {/* 导入面板 */}
          {showImport && (
            <div className="border-t border-purple-200 pt-3 mt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">📥 粘贴 WorkBuddy 生成的序列</p>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono resize-y"
                placeholder={`=== 定时序列 ===\n客户: ABC Metal\n序列名称: 铜管跟进\n\n--- 第1封 ---\nsubject: "..."\nscheduledAt: "2026-06-20 09:00"\ncontent: |\n  ...`} />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleImport} loading={importing}><Upload className="w-3 h-3 mr-1" />导入序列</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowImport(false)}><X className="w-3 h-3 mr-1" />关闭</Button>
              </div>
              {importResult && <p className={`text-xs mt-1 ${importResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{importResult}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
