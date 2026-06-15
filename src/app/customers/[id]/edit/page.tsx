'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle, Loader2, Sparkles, Copy, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import CountrySelect from '@/components/ui/CountrySelect';

interface Contact {
  id: string;
  name: string;
  position: string;
  email: string;
  whatsapp: string;
  phone: string;
  remarks: string;
}

interface FormData {
  companyName: string;
  enterpriseScale: string;
  country: string;
  establishDate: string;
  address: string;
  regCapital: string;
  industry: string;
  employeeCount: string;
  notes: string;
  phone: string;
  fax: string;
  website: string;
  email: string;
  socialMedia: string;
  contactAddress: string;
  keyContactId: string;
  level: string;
  status: string;
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    enterpriseScale: '',
    country: '',
    establishDate: '',
    address: '',
    regCapital: '',
    industry: '',
    employeeCount: '',
    notes: '',
    phone: '',
    fax: '',
    website: '',
    email: '',
    socialMedia: '',
    contactAddress: '',
    keyContactId: '',
    level: 'C',
    status: 'active',
  });
  
  // 联系人列表（用于关键联系人选择）
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('basic');
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 备注自动保存
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesTimer, setNotesTimer] = useState<NodeJS.Timeout | null>(null);
  const [originalNotes, setOriginalNotes] = useState('');

  // AI 分析面板
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiPasteText, setAiPasteText] = useState('');
  const [aiFillSuccess, setAiFillSuccess] = useState('');

  const aiPromptText = `你是一名专业的外贸客户深度调研专家。请对以下公司进行全方位调研分析。

## 🏢 目标公司
${formData.companyName || '公司名称'}

## 🔍 搜索与交叉验证
1. Google搜索："公司名 company profile"、"公司名 revenue"、"公司名 sourcing"、"公司名 lawsuit arbitration"
2. LinkedIn：公司规模、主营业务、关键决策者历史动态
3. 公司官网：About、Products、Contact、News页面
4. **海关数据**：搜索该国海关进出口记录（ImportYeti、Panjiva、国别海关公开数据），查询该公司是否有进出口记录
5. **供应链分析**：如有海关数据，列出该公司的主要供应商（上游）和下游客户是谁，以及采购/销售的具体产品
6. 行业协会、展会参展记录

## 📋 第一部分：深度洞察（自然语言，直接填写到备注栏）

请像这样撰写一段深度分析（200-400字）：

"客户主营[核心业务]，年采购额约[金额]，偏好[付款方式/账期]。曾因[历史事件/纠纷]，需重点关注[风险点]。联系人[姓名]（[职位]）[沟通特点]。海关数据显示：该公司有进出口记录，主要从[国家/供应商]采购[产品名]，同时向[国家/下游客户]出口[产品名]。其他关键信息：[补充]。"

示例：
"客户A，主营建材批发，年采购额约$2M，偏好60天账期（需中信保备案）。2023年曾因质量问题与某浙江供应商仲裁，需重点关注质检条款。联系人John Smith（采购总监）回复迅速，但对价格极敏感。海关数据显示：该公司有进出口记录，主要从中国江苏3家供应商采购镀锌钢管和彩涂板，同时向德国和波兰的下游建筑商出口成品。"

## 📊 第二部分：结构化数据（必须用 | 竖线分隔，用于自动填写表单）

字段顺序：
公司名称 | 企业规模 | 国家 | 成立日期 | 地址 | 注册资本 | 行业 | 员工人数 | 电话 | 传真 | 网址 | 邮箱 | 社媒 | 联系地址

输出：
${formData.companyName || '公司名称'} | [规模] | [国家] | [成立日期] | [地址] | [注册资本] | [行业] | [员工人数] | [电话] | | [网址] | [邮箱] | | 

要求：没有的信息留空，不要表头，不要解释`;

  const handleAiFill = async () => {
    if (!aiPasteText.trim()) return;
    const lines = aiPasteText.split('\n');
    const updates: any = {};
    
    // 1. 解析 | 分隔的结构化数据行
    const dataLine = lines.find(l => l.includes('|') && l.trim().length > 10 && !l.startsWith('#') && !l.startsWith('字段'));
    if (dataLine) {
      const parts = dataLine.split('|').map(p => p.trim());
      const fields = ['companyName','enterpriseScale','country','establishDate','address','regCapital','industry','employeeCount','phone','fax','website','email','socialMedia','contactAddress'];
      parts.forEach((val, i) => { if (fields[i] && val && !val.startsWith('[') && val.length > 1) updates[fields[i]] = val; });
    }
    
    // 2. 提取深度洞察文本作为备注（数据行之前的内容）
    const dataIdx = lines.findIndex(l => l.includes('|') && !l.startsWith('#') && !l.startsWith('字段'));
    const narrativeLines = lines.slice(0, dataIdx >= 0 ? dataIdx : lines.length)
      .filter(l => { const t = l.trim(); return t && !t.startsWith('#') && !t.startsWith('字段') && !t.startsWith('示例') && !t.startsWith('输出') && !t.includes('|'); });
    if (narrativeLines.length > 0) {
      updates.notes = narrativeLines.join(' ').replace(/\s+/g, ' ').trim();
    }
    
    // 3. 智能提取邮箱、电话、网址
    const fullText = lines.join(' ');
    if (!updates.email) { const em = fullText.match(/([\w.+-]+@[\w-]+\.[\w.]+)/); if (em) updates.email = em[1]; }
    if (!updates.phone) { const ph = fullText.match(/(\+?[\d]{2,4}[\s\-]?[\d\s\-\(\)]{7,})/); if (ph) updates.phone = ph[1].trim(); }
    if (!updates.website) { const ws = fullText.match(/(?:www\.|https?:\/\/)([\w./-]+)/i); if (ws) updates.website = ws[0].startsWith('http') ? ws[0] : 'https://' + ws[0]; }
    
    if (Object.keys(updates).length === 0) { setAiFillSuccess('未能解析'); return; }
    const merged = { ...formData, ...updates };
    setFormData(merged);
    setAiFillSuccess(`已填充 ${Object.keys(updates).length} 个字段，自动保存中...`);
    
    // 自动保存
    setIsSubmitting(true);
    try {
      // 日期验证
      let validDate = null;
      if (merged.establishDate) {
        const d = new Date(merged.establishDate);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1900) validDate = merged.establishDate;
      }
      // 员工人数（自由文本）
      const validEmpCount = merged.employeeCount || null;
      
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: merged.companyName.trim(),
          enterpriseScale: merged.enterpriseScale || null,
          country: merged.country || null,
          establishDate: validDate,
          address: merged.address || null,
          regCapital: merged.regCapital || null,
          industry: merged.industry || null,
          employeeCount: validEmpCount,
          notes: merged.notes || null,
          phone: merged.phone || null,
          fax: merged.fax || null,
          website: merged.website || null,
          email: merged.email || null,
          socialMedia: merged.socialMedia || null,
          contactAddress: merged.contactAddress || null,
          keyContactId: merged.keyContactId || null,
          level: merged.level || 'C',
          status: merged.status || 'active',
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setAiFillSuccess(`✅ 已保存 ${Object.keys(updates).length} 个字段`);
      } else if (result.error?.includes('邮箱已被')) {
        // 邮箱重复，去掉邮箱后重试
        setAiFillSuccess(`⚠️ 邮箱已存在，跳过邮箱重新保存...`);
        const retryData = {
          companyName: merged.companyName.trim(),
          enterpriseScale: merged.enterpriseScale || null,
          country: merged.country || null,
          establishDate: validDate,
          address: merged.address || null,
          regCapital: merged.regCapital || null,
          industry: merged.industry || null,
          employeeCount: validEmpCount,
          notes: merged.notes || null,
          phone: merged.phone || null,
          fax: merged.fax || null,
          website: merged.website || null,
          socialMedia: merged.socialMedia || null,
          contactAddress: merged.contactAddress || null,
          keyContactId: merged.keyContactId || null,
          level: merged.level || 'C',
          status: merged.status || 'active',
        };
        const r2 = await fetch(`/api/customers/${customerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(retryData) });
        const d2 = await r2.json();
        if (r2.ok && d2.success) {
          setAiFillSuccess(`✅ 已保存（邮箱重复已跳过，请手动填写）`);
        } else {
          setAiFillSuccess(`⚠️ 保存失败: ${d2.error || ''}`);
        }
      } else {
        setAiFillSuccess(`⚠️ 填充成功但保存失败: ${result.error || ''}`);
      }
    } catch (e: any) {
      setAiFillSuccess(`⚠️ 网络错误: ${e.message}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setAiFillSuccess(''), 5000);
    }
  };
  
  // 获取客户数据
  useEffect(() => {
    fetchCustomer();
  }, [customerId]);
  
  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();
      
      if (result.success) {
        const customer = result.data;
        setFormData({
          companyName: customer.companyName || '',
          enterpriseScale: customer.enterpriseScale || '',
          country: customer.country || '',
          establishDate: customer.establishDate ? customer.establishDate.split('T')[0] : '',
          address: customer.address || '',
          regCapital: customer.regCapital || '',
          industry: customer.industry || '',
          employeeCount: customer.employeeCount?.toString() || '',
          notes: customer.notes || '',
          phone: customer.phone || '',
          fax: customer.fax || '',
          website: customer.website || '',
          email: customer.email || '',
          socialMedia: customer.socialMedia || '',
          contactAddress: customer.contactAddress || '',
          keyContactId: customer.keyContactId || '',
          level: customer.level || 'C',
          status: customer.status || 'active',
        });
        setOriginalNotes(customer.notes || '');
        setAllContacts(customer.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 单独保存备注信息
  const saveNotes = useCallback(async () => {
    if (formData.notes === originalNotes) {
      setNotesSaved(true);
      return;
    }
    setNotesSaving(true);
    try {
      await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: formData.notes || null }),
      });
      setOriginalNotes(formData.notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setNotesSaving(false);
    }
  }, [formData.notes, originalNotes, customerId]);

  // 备注自动保存：2秒无输入后自动保存
  useEffect(() => {
    if (notesTimer) clearTimeout(notesTimer);
    if (formData.notes !== originalNotes) {
      const timer = setTimeout(() => {
        saveNotes();
      }, 2000);
      setNotesTimer(timer);
    }
    return () => { if (notesTimer) clearTimeout(notesTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.notes]);

  // 页面离开时自动保存备注
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (formData.notes !== originalNotes && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/customers/${customerId}`, 
          new Blob([JSON.stringify({ notes: formData.notes || null })], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData.notes, originalNotes, customerId]);
  
  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      alert('公司名称不能为空');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Saving customer:', customerId, formData);
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          enterpriseScale: formData.enterpriseScale || null,
          country: formData.country || null,
          establishDate: formData.establishDate || null,
          address: formData.address || null,
          regCapital: formData.regCapital || null,
          industry: formData.industry || null,
          employeeCount: formData.employeeCount || null,
          notes: formData.notes || null,
          phone: formData.phone || null,
          fax: formData.fax || null,
          website: formData.website || null,
          email: formData.email || null,
          socialMedia: formData.socialMedia || null,
          contactAddress: formData.contactAddress || null,
          keyContactId: formData.keyContactId || null,
          level: formData.level || 'C',
          status: formData.status || 'active',
        }),
      });
      
      const result = await response.json();
      console.log('Save result:', result);
      
      if (response.ok && result.success) {
        alert('✅ 客户更新成功');
        router.push(`/customers/${customerId}`);
      } else if (result.error?.includes('邮箱已被')) {
        // 邮箱重复，去掉邮箱重试
        const r2 = await fetch(`/api/customers/${customerId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: formData.companyName.trim(),
            enterpriseScale: formData.enterpriseScale || null,
            country: formData.country || null,
            establishDate: formData.establishDate || null,
            address: formData.address || null,
            regCapital: formData.regCapital || null,
            industry: formData.industry || null,
            employeeCount: formData.employeeCount || null,
            notes: formData.notes || null,
            phone: formData.phone || null,
            fax: formData.fax || null,
            website: formData.website || null,
            socialMedia: formData.socialMedia || null,
            contactAddress: formData.contactAddress || null,
            keyContactId: formData.keyContactId || null,
            level: formData.level || 'C',
            status: formData.status || 'active',
          }),
        });
        const d2 = await r2.json();
        if (r2.ok && d2.success) {
          alert('✅ 已保存（邮箱重复已跳过，请手动填写邮箱）');
          router.push(`/customers/${customerId}`);
        } else {
          alert(`❌ 保存失败\n${d2.error || ''}`);
        }
      } else {
        alert(`❌ 保存失败\n${result.error || `HTTP ${response.status}`}`);
      }
    } catch (error: any) {
      alert(`❌ 网络请求失败\n${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">编辑客户</h1>
      </div>

      {/* AI 客户分析 */}
      <div className="mb-6">
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">AI 客户分析</span>
            <span className="text-xs text-gray-400">搜索并自动填充客户信息</span>
          </div>
          <span className="text-xs text-blue-600">{showAiPanel ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        
        {showAiPanel && (
          <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">🤖 AI 搜索提示词</p>
                <div className="relative">
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">{aiPromptText}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(aiPromptText); setAiCopied(true); setTimeout(() => setAiCopied(false), 2000); }}
                    className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                    <Copy className="w-3 h-3 inline mr-1" />{aiCopied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">📥 粘贴 AI 结果并填充</p>
                <textarea value={aiPasteText} onChange={e => setAiPasteText(e.target.value)} rows={6}
                  placeholder="粘贴 AI 返回的数据行..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono resize-y" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleAiFill} disabled={!aiPasteText.trim()}>
                    <Upload className="w-3 h-3 mr-1" />智能填充表单
                  </Button>
                  {aiFillSuccess && <span className="text-xs text-green-600 self-center">{aiFillSuccess}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* 标签页导航 */}
        <div className="flex border-b mb-6 overflow-x-auto">
          <button
            type="button"
            className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'contact' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('contact')}
          >
            联系方式
          </button>
        </div>
        
        {/* 基本信息标签页 */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">基本信息</h2>

            {/* 备注信息 — 始终可编辑，自动保存 */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">📝 备注信息</label>
                {notesSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />已自动保存</span>}
                {notesSaving && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />保存中...</span>}
              </div>
              <textarea
                name="notes"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 text-sm resize-y min-h-[80px]"
                value={formData.notes}
                onChange={handleInputChange}
                onBlur={saveNotes}
                placeholder="记录客户背景、沟通要点、注意事项等有价值的信息..."
              />
            </div>

            {/* 公司名称带查重 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                公司名称 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="companyName"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="请输入公司名称"
                />
              </div>
            </div>
            
            {/* 客户等级 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">客户等级</label>
              <select
                name="level"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.level}
                onChange={handleInputChange}
              >
                <option value="A">A 级 — 核心客户</option>
                <option value="B">B 级 — 重要客户</option>
                <option value="C">C 级 — 普通客户</option>
                <option value="D">D 级 — 潜在客户</option>
                <option value="E">E 级 — 观察客户</option>
              </select>
            </div>
            
            {/* 企业规模 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">企业规模</label>
              <input
                type="text"
                name="enterpriseScale"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.enterpriseScale}
                onChange={handleInputChange}
                placeholder="如: 中型企业、50-100人、年营收5000万"
              />
            </div>
            
            {/* 国家 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">国家</label>
              <CountrySelect
                value={formData.country || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              />
            </div>
            
            {/* 成立日期 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">成立日期</label>
              <input
                type="text"
                name="establishDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.establishDate}
                onChange={handleInputChange}
                placeholder="如: 2005年 或 2005-06-15"
              />
            </div>
            
            {/* 地址 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">地址</label>
              <input
                type="text"
                name="address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="请输入公司地址"
              />
            </div>
            
            {/* 注册资本 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">注册资本</label>
              <input
                type="text"
                name="regCapital"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.regCapital}
                onChange={handleInputChange}
                placeholder="请输入注册资本"
              />
            </div>
            
            {/* 公司行业 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">公司行业</label>
              <input
                type="text"
                name="industry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="请输入公司行业"
              />
            </div>
            
            {/* 员工人数 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">员工人数</label>
              <input
                type="text"
                name="employeeCount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.employeeCount}
                onChange={handleInputChange}
                placeholder="如: 500 或 1000-2000"
              />
            </div>
            
          </div>
        )}
        
        {/* 联系方式标签页 */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">联系方式</h2>
            
            {/* 关键联系人选择 */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium mb-1">关键联系人</label>
              <select
                name="keyContactId"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.keyContactId}
                onChange={(e) => {
                  const contactId = e.target.value;
                  setFormData(prev => ({ ...prev, keyContactId: contactId }));
                  // 自动填充联系方式
                  if (contactId) {
                    const contact = allContacts.find(c => c.id === contactId);
                    if (contact) {
                      setFormData(prev => ({
                        ...prev,
                        keyContactId: contactId,
                        phone: contact.phone || prev.phone,
                        email: contact.email || prev.email,
                        socialMedia: contact.whatsapp || prev.socialMedia,
                      }));
                    }
                  }
                }}
              >
                <option value="">不指定关键联系人</option>
                {allContacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.position ? `(${c.position})` : ''} {c.phone ? `- ${c.phone}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-700 mt-1">
                选择关键联系人后自动填充电话、邮箱、WhatsApp
              </p>
            </div>
            
            {/* 电话 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">电话</label>
              <input
                type="text"
                name="phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="请输入公司电话"
              />
            </div>
            
            {/* 传真 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">传真</label>
              <input
                type="text"
                name="fax"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.fax}
                onChange={handleInputChange}
                placeholder="请输入公司传真"
              />
            </div>
            
            {/* 网址 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">网址</label>
              <input
                type="url"
                name="website"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="请输入公司网址"
              />
            </div>
            
            {/* 邮箱 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">邮箱</label>
              <input
                type="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="请输入公司邮箱"
              />
            </div>
            
            {/* 社媒 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">社媒</label>
              <input
                type="text"
                name="socialMedia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.socialMedia}
                onChange={handleInputChange}
                placeholder="请输入社交媒体账号"
              />
            </div>
            
            {/* 联系地址 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">联系地址</label>
              <input
                type="text"
                name="contactAddress"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.contactAddress}
                onChange={handleInputChange}
                placeholder="请输入联系地址"
              />
            </div>
          </div>
        )}
        
        {/* 提交按钮 */}
        <div className="flex flex-col md:flex-row gap-2 border-t pt-4 mt-4">
          <Button 
            type="submit" 
            icon={isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? '保存中...' : '保存修改'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/customers/${customerId}`)}
            className="w-full md:w-auto"
          >
            返回
          </Button>
        </div>
      </form>

    </div>
  );
}
