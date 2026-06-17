'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Download, Upload, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DataItem {
  id: string;
  source: string; // customer_notes, follow_remarks, need_product, need_angle, need_hook
  label: string;
  content: string;
  date?: string;
}

interface Props {
  customerId?: string;
  inquirySubject?: string;
  inquiryBody?: string;
  inquiryId?: string;
  onImport?: () => void;
}

// 策略模板
const STRATEGY_TEMPLATES: Record<string, { label: string; role: string; count: number; interval: number; tone: string; desc: string }> = {
  new_inquiry: { label: '🆕 新询价跟进', role: 'seller', count: 3, interval: 3, tone: 'professional', desc: '感谢→报价→确认' },
  quote_followup: { label: '🔄 报价催单', role: 'seller', count: 2, interval: 2, tone: 'urgent', desc: '提醒→限时优惠' },
  reactivation: { label: '💤 沉寂再激活', role: 'seller', count: 2, interval: 5, tone: 'friendly', desc: '关怀→新品推荐' },
  payment: { label: '💰 付款提醒', role: 'seller', count: 3, interval: 7, tone: 'professional', desc: '提醒→通知→最后通牒' },
  buyer_inquiry: { label: '🛒 采购询价', role: 'buyer', count: 2, interval: 3, tone: 'professional', desc: '询价→要求报价' },
  middleman: { label: '🤝 中间商撮合', role: 'middleman', count: 2, interval: 3, tone: 'friendly', desc: '介绍→撮合' },
  custom: { label: '✏️ 自定义', role: 'seller', count: 3, interval: 3, tone: 'professional', desc: '自由配置' },
};

export default function SequencePromptBuilder({ customerId, inquirySubject, inquiryBody, inquiryId, onImport }: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // 策略模板
  const [strategy, setStrategy] = useState('new_inquiry');
  
  // 可编辑配置
  const [role, setRole] = useState('seller');
  const [emailCount, setEmailCount] = useState(3);
  const [wordsPerEmail, setWordsPerEmail] = useState(150);
  const [intervalDays, setIntervalDays] = useState(3);
  const [tone, setTone] = useState('professional');
  const [sequenceName, setSequenceName] = useState('');

  // 数据条目（从三个来源拉取）
  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [includeCurrEmail, setIncludeCurrEmail] = useState(true);

  // 可编辑 Prompt
  const [prompt, setPrompt] = useState('');
  const [promptEditing, setPromptEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // 导入
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');

  // 加载策略模板
  const applyTemplate = (key: string) => {
    setStrategy(key);
    const t = STRATEGY_TEMPLATES[key];
    if (t && key !== 'custom') {
      setRole(t.role);
      setEmailCount(t.count);
      setIntervalDays(t.interval);
      setTone(t.tone);
    }
  };

  // 拉取数据条目
  useEffect(() => {
    if (showBuilder && customerId) {
      fetchDataItems();
    }
  }, [showBuilder, customerId]);

  const fetchDataItems = async () => {
    setLoadingData(true);
    const items: DataItem[] = [];

    try {
      // 1. 客户管理 → 备注
      const custRes = await fetch(`/api/customers/${customerId}`);
      const custData = await custRes.json();
      if (custData.success && custData.data.notes) {
        items.push({
          id: 'customer-notes', source: 'customer_notes',
          label: '📝 客户备注', content: custData.data.notes,
        });
      }
    } catch {}

    try {
      // 2. 客户开发 → 备注信息 (remarks)
      const followRes = await fetch(`/api/follow-ups?customerId=${customerId}&limit=20`);
      const followData = await followRes.json();
      if (followData.success && followData.data) {
        followData.data.forEach((f: any, i: number) => {
          if (f.remarks) {
            const date = f.lastFollowUpDate ? new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN') : '';
            items.push({
              id: `follow-remark-${f.id || i}`, source: 'follow_remarks',
              label: `📅 开发备注 ${date}`, content: f.remarks, date,
            });
          }
        });
      }
    } catch {}

    try {
      // 3. 需求分析 → 三个维度
      const needsRes = await fetch(`/api/needs-analysis?customerId=${customerId}`);
      const needsData = await needsRes.json();
      if (needsData.success && needsData.data) {
        needsData.data.forEach((n: any) => {
          const catLabel = n.category === 'product_requirement' ? '产品需求' 
            : n.category === 'cooperation_angle' ? '合作切入点' : '钩子信息';
          const icon = n.category === 'product_requirement' ? '📦' 
            : n.category === 'cooperation_angle' ? '🎯' : '🪝';
          items.push({
            id: `need-${n.id}`, source: n.category,
            label: `${icon} ${catLabel}`, content: n.content,
          });
        });
      }
    } catch {}

    setDataItems(items);
    // 默认全选
    setSelectedItems(new Set(items.map(i => i.id)));
    setLoadingData(false);
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedItems(new Set(dataItems.map(i => i.id)));
  const deselectAll = () => setSelectedItems(new Set());

  // 构建 Prompt
  const buildPrompt = () => {
    const roleLabel = role === 'seller' ? '供应商/卖家' : role === 'buyer' ? '采购商/买家' : '中间商/代理商';
    const rolePerspective = role === 'seller' ? '以供应商身份向客户推销产品，强调产品优势和合作价值' 
      : role === 'buyer' ? '以采购商身份向供应商询价，体现专业采购需求' 
      : '以中间商/代理商身份撮合双方，强调对接能力和资源整合';
    const toneLabel = tone === 'professional' ? '专业正式' : tone === 'friendly' ? '友好亲切' : '紧迫有力';

    let dataSection = '';
    const selectedData = dataItems.filter(i => selectedItems.has(i.id));

    // 按来源分组展示
    const groups: Record<string, DataItem[]> = {};
    selectedData.forEach(i => {
      const g = i.source === 'customer_notes' ? '客户备注' : i.source === 'follow_remarks' ? '开发备注' : '需求分析';
      if (!groups[g]) groups[g] = [];
      groups[g].push(i);
    });

    for (const [group, items] of Object.entries(groups)) {
      dataSection += `\n### ${group}\n`;
      items.forEach(i => {
        dataSection += `${i.content.slice(0, 500)}\n`;
      });
    }

    let currEmailSection = '';
    if (includeCurrEmail && inquirySubject) {
      currEmailSection = `\n## 📧 当前邮件\n主题: ${inquirySubject}\n内容: ${(inquiryBody || '').slice(0, 1500)}\n`;
    }

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const p = `你是一名资深外贸业务专家。请以**${roleLabel}**身份生成定时跟进邮件序列。

## 客户数据
${dataSection || '（未选择数据）'}
${currEmailSection}
## ⚙️ 生成参数
| 参数 | 要求 |
|------|------|
| 邮件数量 | **${emailCount} 封** |
| 每封字数 | **${wordsPerEmail} 字左右** |
| 发送间隔 | 每封间隔 **${intervalDays} 天**，从 ${tomorrow} 开始 |
| 用户角色 | **${roleLabel}** — ${rolePerspective} |
| 语气风格 | **${toneLabel}** |
${sequenceName ? `| 序列名称 | **${sequenceName}** |\n` : ''}

## 输出格式 - 严格遵守

每条邮件严格按以下格式输出，字段间用空行分隔：

=== 定时序列 ===
客户: [公司名]
序列名称: ${sequenceName || '[策略名称]'}

--- 第1封 ---
subject: "[邮件主题]"
scheduledAt: "${tomorrow} 09:00"
content: |
  [Markdown格式正文，约${wordsPerEmail}字]

--- 第2封 ---
subject: "[邮件主题]"
scheduledAt: "${new Date(Date.now() + (intervalDays + 1) * 86400000).toISOString().split('T')[0]} 09:00"
content: |
  [Markdown格式正文，约${wordsPerEmail}字]

...共${emailCount}封

格式要求:
- === 定时序列 ===、subject:、scheduledAt:、content: 各占独立行
- content 使用 Markdown 格式
- 禁止代码块标记、禁止多余解释`;

    setPrompt(p);
    setPromptEditing(true);
  };

  // 导入序列
  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/follow-ups/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: importText }),
      });
      const data = await res.json();
      setImportResult(data.success ? `✅ 导入 ${data.count} 封` : `❌ ${data.error}`);
      if (data.success) { setImportText(''); onImport?.(); }
    } catch { setImportResult('导入失败'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={() => setShowBuilder(!showBuilder)}>
        <Sparkles className="w-3 h-3 mr-1" />{showBuilder ? '收起' : 'Prompt 生成序列'}
        {showBuilder ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {showBuilder && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-4 space-y-3 text-sm">
          {/* 策略模板 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">策略模板</label>
            <select value={strategy} onChange={e => applyTemplate(e.target.value)} className="form-input text-xs">
              {Object.entries(STRATEGY_TEMPLATES).map(([k, v]) => (
                <option key={k} value={k}>{v.label} — {v.desc}</option>
              ))}
            </select>
          </div>

          {/* 参数设置 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <label className="text-xs text-gray-500">角色</label>
              <select value={role} onChange={e => { setRole(e.target.value); setStrategy('custom'); }} className="form-input text-xs">
                <option value="seller">供应商</option><option value="buyer">采购商</option><option value="middleman">中间商</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">邮件数</label>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEmailCount(c => Math.max(1, c-1)); setStrategy('custom'); }} className="w-5 h-5 rounded bg-white border text-xs">−</button>
                <span className="text-sm font-bold w-5 text-center">{emailCount}</span>
                <button onClick={() => { setEmailCount(c => Math.min(10, c+1)); setStrategy('custom'); }} className="w-5 h-5 rounded bg-white border text-xs">+</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">字数/封</label>
              <input type="number" value={wordsPerEmail} onChange={e => { setWordsPerEmail(Number(e.target.value)); setStrategy('custom'); }} className="form-input text-xs" min={50} max={500} />
            </div>
            <div>
              <label className="text-xs text-gray-500">间隔天</label>
              <input type="number" value={intervalDays} onChange={e => { setIntervalDays(Number(e.target.value)); setStrategy('custom'); }} className="form-input text-xs" min={1} max={30} />
            </div>
            <div>
              <label className="text-xs text-gray-500">语气</label>
              <select value={tone} onChange={e => { setTone(e.target.value); setStrategy('custom'); }} className="form-input text-xs">
                <option value="professional">专业</option><option value="friendly">友好</option><option value="urgent">紧迫</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={sequenceName} onChange={e => setSequenceName(e.target.value)} className="form-input text-xs" placeholder="序列名称（可选）" />
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={includeCurrEmail} onChange={e => setIncludeCurrEmail(e.target.checked)} className="rounded" />包含当前邮件
            </label>
          </div>

          {/* 数据条目选择 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">选择注入数据（{selectedItems.size}/{dataItems.length} 条）</label>
              <div className="flex gap-1">
                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">全选</button>
                <button onClick={deselectAll} className="text-xs text-gray-400 hover:underline">清空</button>
              </div>
            </div>

            {loadingData ? (
              <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />加载数据中...</div>
            ) : dataItems.length === 0 ? (
              <p className="text-xs text-gray-400">暂无可选数据</p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {['customer_notes', 'follow_remarks', 'product_requirement', 'cooperation_angle', 'hook'].map(cat => {
                  const items = dataItems.filter(i => 
                    cat === 'customer_notes' ? i.source === 'customer_notes'
                    : cat === 'follow_remarks' ? i.source === 'follow_remarks'
                    : i.source === cat
                  );
                  if (items.length === 0) return null;
                  const catLabel = cat === 'customer_notes' ? '客户备注' : cat === 'follow_remarks' ? '开发备注' : 
                    cat === 'product_requirement' ? '产品需求' : cat === 'cooperation_angle' ? '合作切入点' : '钩子信息';
                  return (
                    <div key={cat}>
                      <span className="text-xs text-gray-400">{catLabel}</span>
                      {items.map(i => (
                        <label key={i.id} className="flex items-start gap-1.5 py-1 px-1 hover:bg-white/50 rounded cursor-pointer">
                          <input type="checkbox" checked={selectedItems.has(i.id)} onChange={() => toggleItem(i.id)} className="rounded mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-600 line-clamp-2">{i.label}: {i.content.slice(0, 100)}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prompt 编辑区 */}
          <div className="flex gap-2">
            <Button size="sm" onClick={buildPrompt} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-3 h-3 mr-1" />生成 Prompt
            </Button>
            {prompt && (
              <>
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  <Copy className="w-3 h-3 mr-1" />{copied ? '已复制' : '复制'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { const b = new Blob([prompt], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`prompt-${customerId}.txt`; a.click(); }}>
                  <Download className="w-3 h-3 mr-1" />下载
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowImport(!showImport)}>
                  <Upload className="w-3 h-3 mr-1" />导入
                </Button>
              </>
            )}
          </div>

          {prompt && (
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono resize-y"
            />
          )}

          {/* 导入面板 */}
          {showImport && (
            <div className="border-t border-purple-200 pt-3">
              <p className="text-xs font-medium text-gray-700 mb-1">📥 粘贴 WorkBuddy 生成的序列</p>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono resize-y"
                placeholder={`=== 定时序列 ===\n客户: ABC Metal\n...`} />
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
