'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Download, Upload, FileText, CheckCircle, AlertCircle,
  Sparkles, ClipboardPaste, FileSpreadsheet, Edit3, X, Eye,
  ChevronRight, Copy, Send, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type TabType = 'excel' | 'smart' | 'ai';

interface ParsedCustomer {
  companyName: string;
  country?: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  enterpriseScale?: string;
  notes?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  _confidence?: Record<string, number>;
  _source?: string;
}

export default function ImportCustomersPage() {
  const router = useRouter();
  
  // ===== 通用状态 =====
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  // ===== Excel Tab =====
  const [dragOver, setDragOver] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  
  // ===== Smart Paste Tab =====
  const [pasteText, setPasteText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
  const [parsedStats, setParsedStats] = useState<{ total: number; highConfidence: number } | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<number | null>(null);
  
  // ===== AI Tab =====
  const [aiPromptGenerated, setAiPromptGenerated] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  
  // ===== 通用：下载模板 =====
  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/customers/import/template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('下载模板失败');
    }
  };

  // ===== Excel: 上传 =====
  const handleExcelUpload = async (file: File) => {
    if (!file) return;
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('请上传 Excel（.xlsx / .xls）或 CSV 文件');
      return;
    }
    setExcelFile(file);
    setError('');
    setResult(null);
    setLoading(true);
    
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/customers/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '导入失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleExcelUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleExcelUpload(file);
  };

  // ===== Smart Paste: 智能解析 =====
  const handleSmartParse = async () => {
    if (!pasteText.trim()) { setError('请粘贴文本内容'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/customers/import/smart-parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedCustomers(data.data.customers);
        setParsedStats(data.data.stats);
        setEditingCustomer(null);
      } else {
        setError(data.error || '解析失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  // 编辑解析结果
  const updateParsedCustomer = (index: number, field: string, value: string) => {
    setParsedCustomers(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  // 智能粘贴 → 导入
  const handleSmartImport = async () => {
    if (parsedCustomers.length === 0) { setError('没有可导入的数据'); return; }
    setLoading(true); setError('');
    try {
      let success = 0, failed = 0;
      const errors: string[] = [];
      for (const c of parsedCustomers) {
        if (!c.companyName.trim()) { failed++; continue; }
        try {
          const res = await fetch('/api/customers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: c.companyName,
              country: c.country || undefined,
              industry: c.industry || undefined,
              email: c.email || undefined,
              phone: c.phone || undefined,
              website: c.website || undefined,
              address: c.address || undefined,
              enterpriseScale: c.enterpriseScale || undefined,
              notes: c.notes || undefined,
            }),
          });
          const data = await res.json();
          if (data.success) {
            // 如果有联系人，创建联系人
            if (c.contactName || c.contactPhone || c.contactEmail) {
              await fetch(`/api/customers/${data.data.id}/contacts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: c.contactName || '未命名',
                  position: c.contactPosition || undefined,
                  email: c.contactEmail || undefined,
                  whatsapp: c.contactWhatsapp || undefined,
                  phone: c.contactPhone || undefined,
                }),
              });
            }
            success++;
          } else { failed++; errors.push(data.error || '创建失败'); }
        } catch { failed++; }
      }
      setResult({
        total: parsedCustomers.length, success, failed, skipped: 0,
        errors: errors.map((e, i) => ({ row: i + 1, field: '', message: e })),
        duplicates: [],
        mapping: [],
        unmappedHeaders: [],
      });
    } catch { setError('导入出错'); }
    finally { setLoading(false); }
  };

  // ===== AI Tab: 生成提示词 =====
  const generateAiPrompt = useCallback(() => {
    setAiPromptGenerated(true);
  }, []);

  const aiPromptText = `你是一名专业的外贸客户开发与数据整理助手。请按照以下工作流程处理客户数据。

## 🔍 第一步：信息搜集

对于每个公司，请使用你的搜索能力在以下渠道查找补充信息：

1. **Google 搜索**：搜索"[公司名] email"、"[公司名] contact"、"[公司名] purchasing manager"
2. **LinkedIn**：查找公司主页和关键联系人（CEO、采购经理、销售总监）
3. **公司官网**：从官网提取联系方式、地址、行业描述
4. **B2B平台**（Alibaba、Global Sources、Made-in-China 等）：查找公司信息和认证
5. **各国黄页/商会**：补充企业规模和成立时间

## 📧 第二步：邮箱搜集与验证

1. **优先收集**：info@、sales@、export@ 等通用邮箱
2. **关键联系人邮箱**：采购经理(Purchasing Manager)、CEO、销售总监的个人邮箱
3. **邮箱验证规则**：
   - 确认邮箱域名与公司官网域名一致
   - 排除明显无效格式（如 test@、example@、no-reply@）
   - 优先保留含人名的企业邮箱（如 h.mueller@company.com）
   - 标注邮箱来源（官网/LinkedIn/B2B平台）

## 📱 第三步：WhatsApp 查找

1. 从官网、LinkedIn、Google Business 等渠道查找公司联系电话
2. 将与联系人关联的手机号标记为 WhatsApp 号码
3. 确保号码包含国家代码（如 +49、+1、+86）

## 📋 第四步：系统字段映射

每条客户记录包含以下 21 个字段（按此顺序，Tab分隔）：

| 序号 | 字段名 | 说明 |
|------|--------|------|
| 1 | 公司名称 | 必填，公司全称 |
| 2 | 企业规模 | 如：50-200人 |
| 3 | 国家 | 英文名（如 Germany） |
| 4 | 成立日期 | YYYY-MM-DD |
| 5 | 地址 | 公司详细地址 |
| 6 | 注册资本 | 如：500万欧元 |
| 7 | 行业 | 统一英文（如 Electronics） |
| 8 | 员工人数 | 纯数字 |
| 9 | 备注 | 补充信息 |
| 10 | 电话 | 公司总机 |
| 11 | 传真 | |
| 12 | 网址 | 含 https:// |
| 13 | 邮箱 | 公司邮箱（已验证有效） |
| 14 | 社媒 | LinkedIn/Facebook链接 |
| 15 | 联系地址 | |
| 16 | 联系人姓名 | 决策者优先 |
| 17 | 联系人职位 | |
| 18 | 联系人邮箱 | 个人企业邮箱 |
| 19 | 联系人WhatsApp | 带国家代码 |
| 20 | 联系人电话 | |
| 21 | 联系人备注 | 角色说明 |

## 📝 第五步：输出格式

**严格使用 Tab 分隔，每条一行。缺失留空。**

\`\`\`
ABC Trading Co Ltd\t50-200人\tGermany\t2015-03-15\t123 Main St, Berlin\t500万欧元\tElectronics\t120\t老客户信誉好\t+49-30-123456\t\twww.abctrading.com\tinfo@abctrading.com\thttps://linkedin.com/company/abc\t\tHans Mueller\tPurchasing Manager\th.mueller@abctrading.com\t+4915123456789\t+49-30-123456\t决策者回复快
\`\`\`

## ⚠️ 重要要求

1. **每条公司一行**，Tab 分隔
2. **邮箱必须经过验证**（域名匹配、非测试邮箱）
3. **WhatsApp 必须有关联手机号**
4. **联系人优先决策者**：CEO > 采购经理 > 销售总监 > 其他
5. **不要输出表头、编号、解释文字**
6. **缺失字段留空**
7. **国家统一英文**

---

## 📊 需要处理的客户列表：

[请在此处粘贴公司名称列表，每行一个公司名]

---

请立即开始搜索和整理，只输出 Tab 分隔的数据行。`;

  const copyAiPrompt = async () => {
    try { await navigator.clipboard.writeText(aiPromptText); setAiCopied(true); setTimeout(() => setAiCopied(false), 2000); }
    catch { /* fallback */ }
  };

  // ===== 重置 =====
  const resetAll = () => {
    setResult(null); setError(''); setExcelFile(null);
    setPasteText(''); setParsedCustomers([]); setParsedStats(null);
    setEditingCustomer(null); setAiPromptGenerated(false);
  };

  return (
    <div>
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">批量导入客户</h1>
            <p className="text-sm text-gray-500 mt-0.5">智能识别 · 多格式导入 · AI辅助</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={downloadTemplate} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-1" /> 下载模板
          </Button>
          <Button variant="secondary" onClick={resetAll} className="flex-1 sm:flex-none">
            <RotateCcw className="w-4 h-4 mr-1" /> 重置
          </Button>
          <Button onClick={() => router.push('/customers')} className="flex-1 sm:flex-none">
            客户列表 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {([
          { id: 'excel' as TabType, label: 'Excel 导入', icon: FileSpreadsheet, desc: '上传表格文件' },
          { id: 'smart' as TabType, label: '智能粘贴', icon: ClipboardPaste, desc: '任意文本解析' },
          { id: 'ai' as TabType, label: 'AI 助手', icon: Sparkles, desc: '生成整理提示词' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            <span className="hidden md:inline text-xs text-gray-400 ml-1">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ============ Tab 1: Excel 导入 ============ */}
      {activeTab === 'excel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 上传区 */}
          <Card>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              上传 Excel / CSV
            </h2>
            <p className="text-sm text-gray-500 mb-4">支持 .xlsx / .xls / .csv，自动识别表头字段</p>

            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
                dragOver ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 
                excelFile ? 'border-green-400 bg-green-50' :
                'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById('excel-input')?.click()}
            >
              <input id="excel-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
                  <p className="text-sm text-gray-600">正在解析导入...</p>
                </div>
              ) : excelFile ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                  <p className="font-medium text-gray-900">{excelFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(excelFile.size / 1024).toFixed(1)} KB · 点击重新选择</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="font-medium text-gray-700">点击选择或拖拽文件到此处</p>
                  <p className="text-xs text-gray-500 mt-1">.xlsx / .xls / .csv</p>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
              <p className="font-medium">💡 智能表头识别支持：</p>
              <p>• 中英文表头混合（如：公司名称 / Company Name）</p>
              <p>• 近义词匹配（如：手机/Mobile/电话 都识别为联系电话）</p>
              <p>• 自动跳过空行和重复客户</p>
              <p>• 智能日期解析（2024-01-15 / 2024年1月15日）</p>
            </div>
          </Card>

          {/* 结果区 */}
          <Card>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              导入结果
            </h2>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-5 h-5" /> 导入失败
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}
            {result ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                    <p className="text-xs text-gray-500">总行数</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{result.success}</p>
                    <p className="text-xs text-green-500">成功</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{result.failed + (result.skipped || 0)}</p>
                    <p className="text-xs text-red-500">失败/跳过</p>
                  </div>
                </div>
                
                {result.mapping && result.mapping.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">已识别字段映射：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.mapping.map((m: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {m.original} → {m.target}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.unmappedHeaders && result.unmappedHeaders.length > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs font-medium text-yellow-700">未识别的列（已跳过）：</p>
                    <p className="text-xs text-yellow-600">{result.unmappedHeaders.join('、')}</p>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    <p className="text-xs font-medium text-red-600">错误详情：</p>
                    {result.errors.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-red-500 pl-2 border-l-2 border-red-200">
                        第{e.row}行：{e.message}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => router.push('/customers')} size="sm">查看客户列表</Button>
                  <Button variant="secondary" size="sm" onClick={resetAll}>继续导入</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>上传文件后显示导入结果</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============ Tab 2: 智能粘贴 ============ */}
      {activeTab === 'smart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区 */}
          <Card>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-purple-600" />
              粘贴原始数据
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              粘贴任意格式的客户数据：邮件签名、展会名片、聊天记录、网页复制内容等，系统智能识别并提取客户信息。
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setParsedCustomers([]); }}
              rows={10}
              placeholder={`粘贴示例：\n\nABC Trading Co., Ltd.\nContact: John Smith (Purchasing Manager)\nEmail: john@abctrading.com\nPhone: +1-212-555-0199\nUSA · Electronics Industry\n\n或者：\n公司名称：XYZ GmbH\n国家：德国\n行业：机械设备\n联系人：Hans Mueller\n邮箱：hans@xyz-gmbh.de\n电话：+49-30-12345678`}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleSmartParse} loading={loading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-1" /> 智能解析
              </Button>
              <Button variant="secondary" onClick={() => { setPasteText(''); setParsedCustomers([]); }}>
                清空
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </Card>

          {/* 结果区 */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                解析结果 {parsedStats && `(${parsedCustomers.length}条)`}
              </h2>
              {parsedCustomers.length > 0 && (
                <Button onClick={handleSmartImport} loading={loading} size="sm">
                  <Upload className="w-4 h-4 mr-1" /> 全部导入
                </Button>
              )}
            </div>

            {parsedCustomers.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ClipboardPaste className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>{result ? '导入完成' : '粘贴数据后点击"智能解析"查看结果'}</p>
                {result && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-green-50 rounded text-xs"><span className="text-green-600 font-bold">{result.success}</span> 成功</div>
                      <div className="p-2 bg-red-50 rounded text-xs"><span className="text-red-600 font-bold">{result.failed}</span> 失败</div>
                      <div className="p-2 bg-gray-50 rounded text-xs"><span className="font-bold">{result.total}</span> 总计</div>
                    </div>
                    <Button onClick={() => { setResult(null); router.push('/customers'); }} size="sm">查看客户列表</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {parsedCustomers.map((customer, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${editingCustomer === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {editingCustomer === index ? (
                      // 编辑模式
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">公司名称</label>
                            <input value={customer.companyName} onChange={e => updateParsedCustomer(index, 'companyName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">国家</label>
                            <input value={customer.country || ''} onChange={e => updateParsedCustomer(index, 'country', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">邮箱</label>
                            <input value={customer.email || ''} onChange={e => updateParsedCustomer(index, 'email', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">电话</label>
                            <input value={customer.phone || ''} onChange={e => updateParsedCustomer(index, 'phone', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">行业</label>
                            <input value={customer.industry || ''} onChange={e => updateParsedCustomer(index, 'industry', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">联系人</label>
                            <input value={customer.contactName || ''} onChange={e => updateParsedCustomer(index, 'contactName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingCustomer(null)} className="text-xs text-blue-600 hover:underline">完成编辑</button>
                        </div>
                      </div>
                    ) : (
                      // 预览模式
                      <div>
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{customer.companyName}</span>
                            {customer._confidence?.companyName !== undefined && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                customer._confidence.companyName >= 0.7 ? 'bg-green-100 text-green-700' :
                                customer._confidence.companyName >= 0.4 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {(customer._confidence.companyName * 100).toFixed(0)}%
                              </span>
                            )}
                            {customer._source && (
                              <span className="text-xs text-gray-400">{customer._source}</span>
                            )}
                          </div>
                          <button onClick={() => setEditingCustomer(index)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {customer.country && <span>🌍 {customer.country}</span>}
                          {customer.industry && <span>🏭 {customer.industry}</span>}
                          {customer.email && <span>📧 {customer.email}</span>}
                          {customer.phone && <span>📞 {customer.phone}</span>}
                          {customer.website && <span>🌐 {customer.website}</span>}
                          {customer.contactName && <span>👤 {customer.contactName}{customer.contactPosition ? `(${customer.contactPosition})` : ''}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============ Tab 3: AI 助手 ============ */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI prompt */}
          <Card>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI 数据整理提示词
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              包含完整的21个客户管理字段说明和格式化示例，复制到 ChatGPT/Claude 即可让 AI 帮你整理任意格式的客户数据。
            </p>

            {aiPromptGenerated ? (
              <div className="relative">
                <div className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                  {aiPromptText}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={copyAiPrompt}>
                    <Copy className="w-3 h-3 mr-1" /> {aiCopied ? '已复制' : '复制提示词'}
                  </Button>
                  <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                    <Send className="w-3 h-3 mr-1" /> 打开 ChatGPT
                  </a>
                  <a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700">
                    <Sparkles className="w-3 h-3 mr-1" /> 打开 Claude
                  </a>
                </div>
                <button onClick={() => setAiPromptGenerated(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
                  重新生成
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 mb-4">点击生成整理提示词，复制到 AI 工具中</p>
                <Button onClick={generateAiPrompt} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-1" /> 生成 AI 提示词
                </Button>
              </div>
            )}
          </Card>

          {/* 使用说明 */}
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> 使用方法
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">复制提示词到 AI</p>
                  <p className="text-xs text-gray-500">点击"生成 AI 提示词"，复制后粘贴到 ChatGPT / Claude</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">粘贴原始数据</p>
                  <p className="text-xs text-gray-500">在提示词末尾的"需要整理的数据"处粘贴你的原始客户数据</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">AI 生成标准格式</p>
                  <p className="text-xs text-gray-500">AI 会按 Tab 分隔的格式整理好所有数据</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">粘贴到"智能粘贴"</p>
                  <p className="text-xs text-gray-500">将 AI 整理好的结果复制到"智能粘贴"Tab，系统自动解析并导入</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
              <p className="text-sm font-medium text-purple-700 mb-1">💡 组合使用效果最佳</p>
              <p className="text-xs text-purple-600">
                先用 <strong>AI 助手</strong> 把杂乱数据整理成标准格式，再到 <strong>智能粘贴</strong> 一键解析导入。比手动整理快 10 倍！
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* 底部：字段说明 */}
      <Card className="mt-6">
        <details className="text-sm">
          <summary className="font-medium text-gray-700 cursor-pointer flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            支持的字段说明（智能映射支持中英文 / 近义词）
          </summary>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
            {[
              ['公司名称', 'Company, 客户名称, 企业名称, Name'],
              ['国家', 'Country, Nation, 国家/地区'],
              ['行业', 'Industry, Sector, 所属行业'],
              ['邮箱', 'Email, E-mail, 公司邮箱'],
              ['电话', 'Phone, Tel, 联系电话'],
              ['网址', 'Website, URL, 官网, Web'],
              ['地址', 'Address, Addr, 公司地址'],
              ['企业规模', 'Scale, Size, 规模'],
              ['注册资本', 'Capital, 注册资金'],
              ['员工人数', 'Employees, 员工数'],
              ['联系人', 'Contact, Attn, 联系人姓名'],
              ['联系人职位', 'Position, Title, 职位'],
              ['联系人电话', 'Mobile, Cell, 手机'],
              ['联系人邮箱', 'Contact Email'],
              ['WhatsApp', 'Whatsapp, whatsapp'],
              ['备注', 'Notes, Remark, 说明'],
            ].map(([field, aliases]) => (
              <div key={field} className="p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">{field}</span>
                <p className="text-gray-400 mt-0.5">{aliases}</p>
              </div>
            ))}
          </div>
        </details>
      </Card>
    </div>
  );
}
