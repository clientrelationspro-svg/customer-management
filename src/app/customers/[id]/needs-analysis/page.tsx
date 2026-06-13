'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Target, Package, Anchor, Copy, Upload,
  Plus, Trash2, Edit3, Save, X, FileText, ArrowLeft, ClipboardPaste,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CustomerNeed {
  id: string;
  customerId: string;
  category: string;
  content: string;
  style?: string;
  priority: number;
  source: string;
}

interface CategoryConfig {
  key: string;
  label: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'product_requirement', label: '核心业务', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { key: 'cooperation_angle', label: '合作切入点', icon: Target, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { key: 'hook', label: '钩子信息', icon: Anchor, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
];

const STYLE_LABELS: Record<string, string> = {
  professional: '专业正式', casual: '轻松随意', aggressive: '进取催单',
  consultative: '顾问咨询', friendly: '友好亲切', technical: '技术专业',
};

export default function CustomerNeedsAnalysisPage() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><EmbeddedNeedsContent /></Suspense>;
}

function EmbeddedNeedsContent() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  // 客户信息
  const [customerName, setCustomerName] = useState('');
  const [customerIndustry, setCustomerIndustry] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');

  // 需求数据
  const [needs, setNeeds] = useState<CustomerNeed[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);

  // 当前选中的分类Tab
  const [activeCategory, setActiveCategory] = useState('product_requirement');

  // 手动添加
  const [newContent, setNewContent] = useState('');
  const [newStyle, setNewStyle] = useState('');
  const [adding, setAdding] = useState(false);

  // 编辑
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editStyle, setEditStyle] = useState('');

  // 批量粘贴
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteAdding, setPasteAdding] = useState(false);

  const getAiTemplate = () => {
    return `你是一名专业的外贸市场调研与客户分析专家。请为以下客户进行全方位分析，一次性生成核心业务、合作切入点和钩子信息。

## 🔍 数据搜集与验证

通过以下渠道交叉验证数据（至少2个独立来源）：
1. Google："${customerName} products/services"、"${customerName} company profile"
2. LinkedIn：公司主页（规模、主业、员工、最新动态）
3. ${customerIndustry ? `${customerIndustry}行业协会/展会` : 'B2B平台（Alibaba、Global Sources等）'}
4. 公司官网：Products/Services、About Us、News

## 🏢 目标客户
- 公司名称：${customerName}
${customerIndustry ? `- 行业：${customerIndustry}` : ''}${customerCountry ? `- 国家/地区：${customerCountry}` : ''}

## 📋 需要生成的三部分

### 核心业务
分析公司的核心产品/服务（产品线、主要产品名、服务类型、业务模式、目标市场）

### 合作切入点
分析合作优势（供应链、价格、技术、服务、地缘等）

### 钩子信息
可直接用于WhatsApp/邮件的话术钩子，每条20字以内，直击痛点

## 📝 输出格式（严格按此，可直接导入系统）

## 核心业务
- 具体业务1（基于搜索数据）
- 具体业务2

## 合作切入点
- 切入点1
- 切入点2

## 钩子
- 钩子1
- 钩子2

⚠️ 关键要求：
1. 三个分类标题必须用 ## 开头（即：## 核心业务、## 合作切入点、## 钩子）
2. 每条内容用 - 开头，每行一条
3. 分类之间空一行
4. 只输出上述格式的数据，不要额外解释`; };

  // 智能分类标题匹配
  const matchCategory = (text: string): string | null => {
    // 匹配 ## 核心业务 / ### 核心业务 / **核心业务** / 核心业务： / [核心业务] 等多种格式
    if (/^(#{1,4}\s*)?(\*\*)?\s*(核心业务|产品需求?|主营业务|Products?|Core Business)(\*\*)?\s*[:：]?\s*$/i.test(text)) return 'product_requirement';
    if (/^(#{1,4}\s*)?(\*\*)?\s*(合作切入点?|切入点|Cooperation|Angle|合作优势)(\*\*)?\s*[:：]?\s*$/i.test(text)) return 'cooperation_angle';
    if (/^(#{1,4}\s*)?(\*\*)?\s*(钩子(信息?)?|卖点|吸引点|Hooks?|话术钩子)(\*\*)?\s*[:：]?\s*$/i.test(text)) return 'hook';
    // 也支持中文+英文数字开头格式
    if (/^(#{1,4}\s*)?(\*\*)?\s*1[\.、）\)]\s*(核心业务|产品|业务)(\*\*)?/i.test(text)) return 'product_requirement';
    if (/^(#{1,4}\s*)?(\*\*)?\s*2[\.、）\)]\s*(合作|切入点)(\*\*)?/i.test(text)) return 'cooperation_angle';
    if (/^(#{1,4}\s*)?(\*\*)?\s*3[\.、）\)]\s*(钩子|话术)(\*\*)?/i.test(text)) return 'hook';
    return null;
  };

  // 清理单行内容
  const cleanLine = (line: string): string | null => {
    // 去掉各种前缀
    let cleaned = line.trim()
      .replace(/^#{1,4}\s*/, '')           // 标题符号
      .replace(/^\d+[\.、\)）]\s*/, '')      // 数字编号
      .replace(/^[-*•·–—▶▸›»]\s*/, '')       // 列表符号
      .replace(/^\[\d+\]\s*/, '')            // [1] 格式
      .replace(/^[\[\]]/g, '')               // 方括号
      .replace(/^\*\*|\*\*$/g, '')            // 粗体标记
      .trim();
    
    // 过滤无效行
    if (cleaned.length < 4) return null;
    if (cleaned.startsWith('#')) return null;
    if (cleaned.startsWith('```')) return null;
    if (/^(输出格式|要求|数据搜集|目标客户|客户信息|公司名称|行业|国家)/.test(cleaned)) return null;
    
    return cleaned;
  };

  const handlePaste = async () => {
    if (!pasteText.trim()) return;
    setPasteAdding(true);
    
    const sections: Record<string, string[]> = { product_requirement: [], cooperation_angle: [], hook: [] };
    let currentCat = 'product_requirement';
    let headerFound = false;
    
    const lines = pasteText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 检测分类标题切换
      const catMatch = matchCategory(trimmed);
      if (catMatch) {
        currentCat = catMatch;
        headerFound = true;
        continue;
      }
      
      // 清理并提取内容
      const cleaned = cleanLine(trimmed);
      if (cleaned && headerFound) {
        sections[currentCat].push(cleaned);
      }
    }
    
    // 如果没有找到任何标题，整个文本按当前分类导入
    if (!headerFound) {
      for (const line of lines) {
        const cleaned = cleanLine(line);
        if (cleaned) sections[activeCategory].push(cleaned);
      }
    }
    
    let success = 0;
    for (const [cat, items] of Object.entries(sections)) {
      for (const item of items) {
        try {
          await fetch('/api/needs-analysis', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, category: cat, content: item }),
          });
          success++;
        } catch {}
      }
    }
    if (success > 0) { setPasteText(''); loadNeeds(); }
    setPasteAdding(false);
  };

  // 加载客户和需求
  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomerName(data.data.companyName || '');
        setCustomerIndustry(data.data.industry || '');
        setCustomerCountry(data.data.country || '');
      }
    } catch (e) { console.error(e); }
    loadNeeds();
  };

  const loadNeeds = async () => {
    setLoadingNeeds(true);
    try {
      const res = await fetch(`/api/needs-analysis?customerId=${customerId}`);
      const data = await res.json();
      setNeeds(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingNeeds(false); }
  };

  // 手动添加
  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/needs-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, category: activeCategory, content: newContent.trim(), style: newStyle || null }),
      });
      if (res.ok) { setNewContent(''); setNewStyle(''); loadNeeds(); }
    } finally { setAdding(false); }
  };

  // 删除
  const handleDelete = async (id: string) => {
    await fetch(`/api/needs-analysis/${id}`, { method: 'DELETE' });
    loadNeeds();
  };

  // 编辑
  const startEdit = (need: CustomerNeed) => { setEditingId(need.id); setEditContent(need.content); setEditStyle(need.style || ''); };
  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await fetch(`/api/needs-analysis/${editingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim(), style: editStyle || null }),
    });
    setEditingId(null);
    loadNeeds();
  };

  const stats = (cat: string) => needs.filter(n => n.category === cat);
  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!;
  const activeNeeds = needs.filter(n => n.category === activeCategory);
  const totalNeeds = stats('product_requirement').length + stats('cooperation_angle').length + stats('hook').length;

  return (
    <div>
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <button onClick={() => router.push(`/customers/${customerId}`)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-500" />
            AI客户分析
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span className="font-medium text-gray-700">{customerName}</span>
            {customerIndustry && <span>· {customerIndustry}</span>}
            {customerCountry && <span>· {customerCountry}</span>}
            <span className="text-gray-400">· 共 {totalNeeds} 条</span>
          </div>
        </div>
      </div>

      {/* 分类统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeCategory === cat.key ? `${cat.borderColor} ${cat.bgColor} shadow-sm` : 'border-gray-100 bg-white hover:border-gray-200'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <span className="text-sm font-medium text-gray-900">{cat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats(cat.key).length}</p>
            <p className="text-xs text-gray-500">条</p>
          </button>
        ))}
      </div>

      {/* 当前分类内容 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <activeCat.icon className={`w-5 h-5 ${activeCat.color}`} />
            {activeCat.label}
            <span className="text-sm text-gray-400 font-normal">({activeNeeds.length}条)</span>
          </h2>
          <select value={newStyle} onChange={e => setNewStyle(e.target.value)} className="text-xs px-2 py-1 border border-gray-300 rounded">
            <option value="">风格（可选）</option>
            {Object.entries(STYLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loadingNeeds ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : activeNeeds.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <activeCat.icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            暂无{activeCat.label}，手动添加或使用 AI 分析生成
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
            {activeNeeds.map(need => (
              <div key={need.id} className={`p-3 rounded-lg border ${need.source === 'ai_generated' ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200 bg-white'}`}>
                {editingId === need.id ? (
                  <div className="flex gap-2">
                    <input value={editContent} onChange={e => setEditContent(e.target.value)} className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm" autoFocus />
                    <select value={editStyle} onChange={e => setEditStyle(e.target.value)} className="text-xs px-1 py-1 border border-gray-300 rounded w-20">
                      <option value="">风格</option>
                      {Object.entries(STYLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="flex-1 text-sm text-gray-900">{need.content}</span>
                    {need.style && <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 whitespace-nowrap">{STYLE_LABELS[need.style] || need.style}</span>}
                    <button onClick={() => startEdit(need)} className="p-0.5 text-gray-400 hover:text-blue-600"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(need.id)} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 批量粘贴 */}
        <div className="mb-3">
          <button onClick={() => setShowPaste(!showPaste)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
            <ClipboardPaste className="w-3.5 h-3.5" />
            {showPaste ? '收起批量粘贴' : '批量粘贴' + activeCat.label}
          </button>
          {showPaste && (
            <div className="mt-2 space-y-2">
              {!pasteText.trim() && (
                <div className="relative">
                  <div className="p-2.5 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap opacity-60">
                    {getAiTemplate()}
                  </div>
                  <button onClick={() => { setPasteText(getAiTemplate()); }}
                    className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                    <Copy className="w-3 h-3 inline mr-1" />使用模板
                  </button>
                </div>
              )}
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                rows={5}
                placeholder={`每行一条${activeCat.label}，或粘贴AI生成的列表...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono resize-y" />
              <div className="flex gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(getAiTemplate()); }} variant="secondary" size="sm" className="text-xs">
                  <Copy className="w-3 h-3 mr-1" />复制模板
                </Button>
                <Button onClick={handlePaste} loading={pasteAdding} disabled={!pasteText.trim()} size="sm" className="text-xs">
                  <Upload className="w-3 h-3 mr-1" />批量添加
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 单条添加 */}
        <div className="flex gap-2">
          <input value={newContent} onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`添加${activeCat.label}...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          <Button onClick={handleAdd} loading={adding} disabled={!newContent.trim()} size="sm">
            <Plus className="w-4 h-4 mr-1" /> 添加
          </Button>
        </div>
      </Card>
    </div>
  );
}
