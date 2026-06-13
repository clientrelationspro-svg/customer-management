'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Copy,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Users,
  Package,
  Target,
  MessageSquare,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  companyName: string;
  industry?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface ScriptConfig {
  whatsapp: number;
  email: number;
  phone: number;
  wechat: number;
}

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  hint?: string;
  total?: number;
  created?: number;
  failed?: number;
  results?: Array<{ status: string; type: string; title: string; id?: string; error?: string }>;
}

const DEFAULT_SCRIPT_CONFIG: ScriptConfig = {
  whatsapp: 3,
  email: 2,
  phone: 1,
  wechat: 0,
};

function AiAnalysisPageContent() {
  const router = useRouter();
  
  // 客户选择
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  
  // 客户基本信息（手动输入或自动填充）
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPosition, setContactPosition] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  
  // 产品需求和合作切入点
  const [productNeeds, setProductNeeds] = useState('');
  const [cooperationAngle, setCooperationAngle] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  
  // 从需求分析模块加载的数据
  const [loadedNeeds, setLoadedNeeds] = useState<{product_requirement: string[], cooperation_angle: string[], hook: string[]}>({
    product_requirement: [], cooperation_angle: [], hook: [],
  });
  
  // 话术配置
  const [scriptConfig, setScriptConfig] = useState<ScriptConfig>(DEFAULT_SCRIPT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // AI提示词
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  
  // 导入
  const [importCustomerId, setImportCustomerId] = useState('');
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    setCustomerLoading(true);
    try {
      const res = await fetch('/api/customers?limit=200');
      const data = await res.json();
      setCustomers(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 选择客户后自动填充信息
  const handleCustomerSelect = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCompanyName('');
      setIndustry('');
      setCountry('');
      setContactPerson('');
      setContactPosition('');
      return;
    }
    
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        const c = data.data;
        setCompanyName(c.companyName || '');
        setIndustry(c.industry || '');
        setCountry(c.country || '');
        
        // 获取联系人
        if (c.contacts && c.contacts.length > 0) {
          const primary = c.contacts.find((ct: any) => ct.id === c.keyContactId) || c.contacts[0];
          setContactPerson(primary.name || '');
          setContactPosition(primary.position || '');
        }
        setCustomerNotes(c.notes || '');
        
        // 加载需求分析数据
        try {
          const needsRes = await fetch(`/api/needs-analysis?customerId=${customerId}`);
          const needsData = await needsRes.json();
          if (needsData.success) {
            const needs = needsData.data || [];
            setLoadedNeeds({
              product_requirement: needs.filter((n: any) => n.category === 'product_requirement').map((n: any) => n.content),
              cooperation_angle: needs.filter((n: any) => n.category === 'cooperation_angle').map((n: any) => n.content),
              hook: needs.filter((n: any) => n.category === 'hook').map((n: any) => n.content),
            });
            // 自动填充到对应字段
            if (!productNeeds) {
              const reqs = needs.filter((n: any) => n.category === 'product_requirement').map((n: any) => n.content).join('\n');
              if (reqs) setProductNeeds(reqs);
            }
            if (!cooperationAngle) {
              const angles = needs.filter((n: any) => n.category === 'cooperation_angle').map((n: any) => n.content).join('\n');
              if (angles) setCooperationAngle(angles);
            }
          }
        } catch (e) { console.error('Failed to load needs:', e); }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 修改话术数量
  const updateScriptCount = (type: keyof ScriptConfig, value: number) => {
    setScriptConfig(prev => ({ ...prev, [type]: Math.max(0, Math.min(20, value)) }));
  };

  // 生成AI提示词
  const handleGeneratePrompt = () => {
    if (!companyName.trim()) {
      alert('请至少输入公司名称');
      return;
    }

    const totalScripts = scriptConfig.whatsapp + scriptConfig.email + scriptConfig.phone + scriptConfig.wechat;
    if (totalScripts === 0) {
      alert('请至少设置一种话术类型的条数');
      return;
    }

    let typeDescriptions: string[] = [];
    if (scriptConfig.whatsapp > 0) typeDescriptions.push(`WhatsApp ${scriptConfig.whatsapp} 条`);
    if (scriptConfig.email > 0) typeDescriptions.push(`邮件 ${scriptConfig.email} 条`);
    if (scriptConfig.phone > 0) typeDescriptions.push(`电话 ${scriptConfig.phone} 条`);
    if (scriptConfig.wechat > 0) typeDescriptions.push(`微信 ${scriptConfig.wechat} 条`);

    const prompt = `你是一名资深外贸业务专家。请根据以下客户信息，生成专业的外贸开发话术。

---

## 📋 客户基本信息
- **公司名称**：${companyName}${industry ? `\n- **行业**：${industry}` : ''}${country ? `\n- **国家/地区**：${country}` : ''}${contactPerson ? `\n- **联系人**：${contactPerson}${contactPosition ? `（${contactPosition}）` : ''}` : ''}${customerNotes ? `\n- **客户备注**：${customerNotes}` : ''}

${productNeeds ? `## 🛒 产品需求${productNeeds}` : ''}

${cooperationAngle ? `## 🎯 合作切入点\n${cooperationAngle}` : ''}

${loadedNeeds.hook.length > 0 ? `## 🪝 话术钩子（建议在话术中使用）\n${loadedNeeds.hook.map(h => `- ${h}`).join('\n')}\n` : ''}

${additionalContext ? `## 📝 补充信息\n${additionalContext}` : ''}

---

## 🎯 话术生成要求

请生成 **${totalScripts} 条** 话术，具体要求如下：
${typeDescriptions.map(t => `- ${t}`).join('\n')}

### 话术要求:
1. **专业性**：语言专业、地道，符合外贸商务沟通规范
2. **针对性**：结合客户行业、需求和合作切入点，避免泛泛而谈
3. **多样性**：同类型话术要有不同角度（破冰、开发、催单、解决问题等）
4. **可操作性**：包含具体的下一步行动指引
5. **人性化**：语气自然亲切，避免生硬的推销感
6. **文化适配**：根据客户国家/地区调整沟通风格

### 输出格式（严格按此格式，每条话术用 --- 分隔）：

### [类型] 话术标题（简明扼要，10字以内）
话术正文内容
（可包含换行、适当使用 emoji 增强表达）

---

### 类型标注：
- WhatsApp 话术标注为 [WhatsApp]
- 邮件话术标注为 [Email]  
- 电话话术标注为 [电话]
- 微信话术标注为 [微信]

请直接输出话术内容，无需额外解释。`;

    setGeneratedPrompt(prompt);
  };

  // 复制提示词
  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = generatedPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 下载提示词为文件
  const handleDownloadPrompt = () => {
    if (!generatedPrompt) return;
    const blob = new Blob([generatedPrompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-prompt-${companyName || 'customer'}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // 导入AI生成的话术
  const handleImport = async () => {
    if (!importCustomerId) {
      alert('请选择导入到哪个客户');
      return;
    }
    if (!importText.trim() && !importFile) {
      alert('请粘贴AI生成的内容或选择文件');
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    
    try {
      let res;
      if (importFile) {
        const text = await importFile.text();
        res = await fetch('/api/ai-analysis/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: importCustomerId, text }),
        });
      } else {
        res = await fetch('/api/ai-analysis/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: importCustomerId, text: importText }),
        });
      }
      const result = await res.json();
      setImportResult(result);
    } catch (e) {
      setImportResult({ success: false, error: '导入请求失败，请稍后重试' });
    } finally {
      setImporting(false);
    }
  };

  // 获取话术总数
  const totalScripts = scriptConfig.whatsapp + scriptConfig.email + scriptConfig.phone + scriptConfig.wechat;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-500" />
            AI 分析
          </h1>
          <p className="text-sm text-gray-500 mt-1">智能生成结构化提示词，批量导入AI话术</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========== 左侧：AI提示词生成 ========== */}
        <div className="space-y-6">
          {/* 客户选择 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">客户信息</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择已有客户 <span className="text-gray-400 text-xs">（自动填充信息）</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    onFocus={loadCustomers}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- 选择客户（或手动输入） --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                  {selectedCustomerId && (
                    <button
                      onClick={() => router.push(`/customers/${selectedCustomerId}`)}
                      className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm whitespace-nowrap"
                      title="查看客户详情"
                    >
                      查看
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="输入公司名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">行业</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="如：机械设备、电子元器件"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">国家/地区</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="如：德国、美国"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="联系人姓名"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人职位</label>
                  <input
                    type="text"
                    value={contactPosition}
                    onChange={(e) => setContactPosition(e.target.value)}
                    placeholder="如：采购经理"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户备注</label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="其他重要信息"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 产品需求 & 合作切入点 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">需求 & 切入点</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Package className="w-4 h-4 inline mr-1 text-gray-400" />
                  产品需求
                </label>
                <textarea
                  value={productNeeds}
                  onChange={(e) => setProductNeeds(e.target.value)}
                  rows={3}
                  placeholder="描述客户的产品需求，如：需要XX型号的机械设备，关注质量和价格，需要FOB报价..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Target className="w-4 h-4 inline mr-1 text-gray-400" />
                  合作切入点
                </label>
                <textarea
                  value={cooperationAngle}
                  onChange={(e) => setCooperationAngle(e.target.value)}
                  rows={3}
                  placeholder="描述合作切入点和优势，如：我们有20年行业经验，提供OEM/ODM服务，样品3天可寄出..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1 text-gray-400" />
                  补充上下文
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={2}
                  placeholder="补充信息：如展会认识、老客户推荐、竞品分析等..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          </Card>

          {/* 话术设置 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">话术生成设置</h2>
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                高级设置
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-green-700 text-xs font-medium mb-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updateScriptCount('whatsapp', scriptConfig.whatsapp - 1)}
                    className="w-7 h-7 rounded bg-green-200 hover:bg-green-300 text-green-800 flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="w-8 text-lg font-bold text-green-800">{scriptConfig.whatsapp}</span>
                  <button
                    onClick={() => updateScriptCount('whatsapp', scriptConfig.whatsapp + 1)}
                    className="w-7 h-7 rounded bg-green-200 hover:bg-green-300 text-green-800 flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                </div>
                <p className="text-xs text-green-600 mt-1">条</p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-orange-700 text-xs font-medium mb-1">
                  <Mail className="w-3.5 h-3.5" /> 邮件
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updateScriptCount('email', scriptConfig.email - 1)}
                    className="w-7 h-7 rounded bg-orange-200 hover:bg-orange-300 text-orange-800 flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="w-8 text-lg font-bold text-orange-800">{scriptConfig.email}</span>
                  <button
                    onClick={() => updateScriptCount('email', scriptConfig.email + 1)}
                    className="w-7 h-7 rounded bg-orange-200 hover:bg-orange-300 text-orange-800 flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                </div>
                <p className="text-xs text-orange-600 mt-1">条</p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-blue-700 text-xs font-medium mb-1">
                  <Phone className="w-3.5 h-3.5" /> 电话
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updateScriptCount('phone', scriptConfig.phone - 1)}
                    className="w-7 h-7 rounded bg-blue-200 hover:bg-blue-300 text-blue-800 flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="w-8 text-lg font-bold text-blue-800">{scriptConfig.phone}</span>
                  <button
                    onClick={() => updateScriptCount('phone', scriptConfig.phone + 1)}
                    className="w-7 h-7 rounded bg-blue-200 hover:bg-blue-300 text-blue-800 flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                </div>
                <p className="text-xs text-blue-600 mt-1">条</p>
              </div>

              <div className="p-3 bg-teal-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-teal-700 text-xs font-medium mb-1">
                  💬 微信
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => updateScriptCount('wechat', scriptConfig.wechat - 1)}
                    className="w-7 h-7 rounded bg-teal-200 hover:bg-teal-300 text-teal-800 flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="w-8 text-lg font-bold text-teal-800">{scriptConfig.wechat}</span>
                  <button
                    onClick={() => updateScriptCount('wechat', scriptConfig.wechat + 1)}
                    className="w-7 h-7 rounded bg-teal-200 hover:bg-teal-300 text-teal-800 flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                </div>
                <p className="text-xs text-teal-600 mt-1">条</p>
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-2">
                <p className="font-medium text-gray-700">高级设置说明：</p>
                <p>• 每种类型最多生成 20 条话术</p>
                <p>• 生成的话术会指定特定的沟通角度（破冰、开发、催单等）</p>
                <p>• 提示词会自动适配客户行业和地区的沟通风格</p>
                <p>• 生成后可直接粘贴到 ChatGPT、Claude 等 AI 工具中</p>
              </div>
            )}

            <Button
              onClick={handleGeneratePrompt}
              disabled={!companyName.trim() || totalScripts === 0}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              生成 AI 提示词（共 {totalScripts} 条话术）
            </Button>
          </Card>
        </div>

        {/* ========== 右侧：提示词展示 & 话术导入 ========== */}
        <div className="space-y-6">
          {/* AI提示词展示 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI 提示词</h2>
              </div>
              {generatedPrompt && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyPrompt}>
                    <Copy className="w-4 h-4 mr-1" />
                    {copied ? '已复制' : '复制'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownloadPrompt}>
                    <Download className="w-4 h-4 mr-1" />
                    下载
                  </Button>
                </div>
              )}
            </div>

            {generatedPrompt ? (
              <div className="relative">
                <div className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {generatedPrompt}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="https://chat.openai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                  >
                    <Send className="w-3 h-3" /> 打开 ChatGPT
                  </a>
                  <a
                    href="https://claude.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> 打开 Claude
                  </a>
                  <span className="text-xs text-gray-500 self-center">
                    复制提示词 → 粘贴到 AI 工具 → 获得话术 → 导入下方
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>填写左侧客户信息</p>
                <p className="text-sm">点击"生成 AI 提示词"按钮</p>
              </div>
            )}
          </Card>

          {/* 导入AI生成的话术 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">导入 AI 话术</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              将 AI 生成的话术内容粘贴到下方，系统自动解析并导入到指定客户的开发话术库
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  导入到客户 <span className="text-red-500">*</span>
                </label>
                <select
                  value={importCustomerId}
                  onChange={(e) => setImportCustomerId(e.target.value)}
                  onFocus={loadCustomers}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择目标客户</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  粘贴 AI 生成的内容
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setImportFile(null); }}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`将 AI 生成的话术粘贴到此处...

支持的格式示例：

### [WhatsApp] 初次问好
Hi John，很高兴在展会上认识您！
我们对您的需求非常感兴趣...

---

### [Email] 产品报价
Dear John，
Thank you for your inquiry...
`}
                />

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">或上传文件：</span>
                  <input
                    type="file"
                    accept=".md,.txt,.markdown"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImportFile(e.target.files[0]);
                        setImportText('');
                      }
                    }}
                    className="flex-1 text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleImport}
                loading={importing}
                disabled={(!importText.trim() && !importFile) || !importCustomerId}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                智能解析并导入话术
              </Button>

              {importResult && (
                <div className={`p-4 rounded-lg ${
                  importResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium text-sm ${
                      importResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {importResult.message || importResult.error || (importResult.success ? '导入成功' : '导入失败')}
                    </span>
                  </div>
                  
                  {importResult.results && importResult.results.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {importResult.results.map((r, i) => (
                        <div key={i} className={`text-xs flex items-center gap-2 ${
                          r.status === 'created' ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {r.status === 'created' ? (
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white">
                            {r.type === 'whatsapp' ? '💚' : r.type === 'email' ? '📧' : r.type === 'phone' ? '📞' : '💬'}
                            [{r.type}]
                          </span>
                          <span className="truncate">{r.title}</span>
                          {r.status === 'created' && (
                            <span className="text-green-500 ml-auto whitespace-nowrap">✓ 已导入</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {importResult.hint && (
                    <div className="mt-3 p-2 bg-white rounded text-xs text-gray-600">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      {importResult.hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* 格式参考 */}
          <Card>
            <details className="text-sm">
              <summary className="font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                支持的导入格式说明
              </summary>
              <div className="mt-3 space-y-3 text-xs text-gray-600">
                <div>
                  <p className="font-medium text-gray-700 mb-1">格式1：段落分隔（推荐）</p>
                  <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{`### [WhatsApp] 产品介绍
Hi [Name]，我们的[产品]...
---

### [Email] 开发邮件
Dear [Name]，
Thank you for...`}</pre>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">格式2：列表式</p>
                  <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{`**话术类型**: WhatsApp
**标题**: 产品介绍
**内容**:
Hi [Name]...`}</pre>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">格式3：标签式</p>
                  <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{`【WhatsApp】产品介绍
Hi [Name]，我们的产品...`}</pre>
                </div>
                <p className="text-purple-600">
                  💡 提示：系统会自动识别 WhatsApp、Email、电话、微信 等关键词
                </p>
              </div>
            </details>
          </Card>
        </div>
      </div>

      {/* 使用流程 */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" /> 使用流程
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="font-medium text-purple-700 mb-1 flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs">1</span>
              填写客户信息
            </div>
            <p className="text-purple-600 text-xs">选择已有客户或手动输入公司名称、行业、需求等</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="font-medium text-blue-700 mb-1 flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">2</span>
              生成提示词
            </div>
            <p className="text-blue-600 text-xs">设置话术类型和数量，一键生成结构化 AI 提示词</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="font-medium text-green-700 mb-1 flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs">3</span>
              AI 生成话术
            </div>
            <p className="text-green-600 text-xs">复制提示词到 ChatGPT/Claude，AI 自动生成专业话术</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="font-medium text-orange-700 mb-1 flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-xs">4</span>
              智能导入
            </div>
            <p className="text-orange-600 text-xs">粘贴 AI 结果，系统自动解析并导入到开发话术库</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AiAnalysisPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <AiAnalysisPageContent />
    </Suspense>
  );
}
