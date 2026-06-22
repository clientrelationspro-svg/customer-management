'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle, Loader2, Sparkles, Copy, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { logActivity } from '@/lib/activity';

interface Contact {
  id: string;
  name: string;
  position: string;
  email: string;
  whatsapp: string;
  phone: string;
  remarks: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  
  // 表单状态
  const [formData, setFormData] = useState({
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
    level: 'C',
    status: 'active',
  });
  
  // 联系人列表
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // 查重相关状态
  const [companyNameExists, setCompanyNameExists] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('basic');
  
  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI 分析面板
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiPasteText, setAiPasteText] = useState('');
  const [aiFillSuccess, setAiFillSuccess] = useState('');

  const aiPromptText = `你是一名专业的外贸客户深度调研专家。请对以下公司进行全方位调研分析。

## 🏢 目标公司
${formData.companyName || '公司名称'}

## 🔍 搜索与交叉验证
1. Google搜索："公司名 company profile"、"公司名 revenue"、"公司名 sourcing"
2. LinkedIn：公司规模、主营业务、关键决策者
3. 公司官网：About、Products、Contact页面
4. **海关数据**：查询该公司进出口记录（ImportYeti、Panjiva等）
5. **供应链分析**：列出主要供应商和下游客户

## 📋 第一部分：深度洞察（填写到备注栏）
200-400字分析，格式：
"客户主营[核心业务]，年采购额约[金额]，偏好[付款方式]。曾因[事件]需关注[风险点]。联系人[姓名]([职位])[特点]。海关数据显示：主要从[国家]采购[产品]，向[国家]出口[产品]。其他：[补充]。"

## 📊 第二部分：结构化数据（用 | 竖线分隔）
字段顺序：公司名称 | 企业规模 | 国家 | 成立日期 | 地址 | 注册资本 | 行业 | 员工人数 | 电话 | 传真 | 网址 | 邮箱 | 社媒 | 联系地址
输出：${formData.companyName || '公司名称'} | [规模] | [国家] | [日期] | [地址] | [注册资本] | [行业] | [人数] | [电话] | | [网址] | [邮箱] | | 

要求：没有的信息留空，不要表头，不要解释`;

  const handleAiFill = () => {
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

    // 2. 提取深度洞察文本作为备注
    const dataIdx = lines.findIndex(l => l.includes('|') && !l.startsWith('#') && !l.startsWith('字段'));
    const narrativeLines = lines.slice(0, dataIdx >= 0 ? dataIdx : lines.length)
      .filter(l => { const t = l.trim(); return t && !t.startsWith('#') && !t.startsWith('字段') && !t.startsWith('示例') && !t.startsWith('输出') && !t.startsWith('要求') && !l.includes('|'); });
    if (narrativeLines.length > 0) {
      updates.notes = narrativeLines.join(' ').replace(/\s+/g, ' ').trim();
    }

    // 3. 智能提取邮箱、电话、网址
    const fullText = lines.join(' ');
    if (!updates.email) { const em = fullText.match(/([\w.+-]+@[\w-]+\.[\w.]+)/); if (em) updates.email = em[1]; }
    if (!updates.phone) { const ph = fullText.match(/(\+?[\d]{2,4}[\s\-]?[\d\s\-\(\)]{7,})/); if (ph) updates.phone = ph[1].trim(); }
    if (!updates.website) { const ws = fullText.match(/(?:www\.|https?:\/\/)([\w./-]+)/i); if (ws) updates.website = ws[0].startsWith('http') ? ws[0] : 'https://' + ws[0]; }

    if (Object.keys(updates).length === 0) { setAiFillSuccess('未能解析'); return; }

    setFormData(prev => ({ ...prev, ...updates }));
    setAiFillSuccess(`已填充 ${Object.keys(updates).length} 个字段`);
    setTimeout(() => setAiFillSuccess(''), 4000);
  };
  
  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // 查重函数
  const checkCompanyNameDuplicate = useCallback(async (companyName: string) => {
    if (!companyName || companyName.length < 2) {
      setCompanyNameExists(false);
      setDuplicateMessage('');
      return;
    }
    
    setIsChecking(true);
    try {
      const response = await fetch(`/api/customers/check-duplicate?companyName=${encodeURIComponent(companyName)}`);
      const data = await response.json();
      
      if (data.success && data.exists) {
        setCompanyNameExists(true);
        setDuplicateMessage('该公司名称已存在，请更换');
      } else {
        setCompanyNameExists(false);
        setDuplicateMessage('');
      }
    } catch (error) {
      console.error('Error checking company name duplicate:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  // 防抖处理查重
  useEffect(() => {
    if (!formData.companyName) {
      setCompanyNameExists(false);
      setDuplicateMessage('');
      return;
    }
    
    const timer = setTimeout(() => {
      checkCompanyNameDuplicate(formData.companyName);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.companyName, checkCompanyNameDuplicate]);
  
  // 添加联系人
  const addContact = () => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: '',
      position: '',
      email: '',
      whatsapp: '',
      phone: '',
      remarks: '',
    };
    setContacts(prev => [...prev, newContact]);
  };
  
  // 删除联系人
  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== id));
  };
  
  // 处理联系人输入变化
  const handleContactChange = (id: string, field: keyof Contact, value: string) => {
    setContacts(prev => prev.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };
  
  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查公司名称是否重复
    if (companyNameExists) {
      alert('公司名称已存在，请更换后再提交');
      return;
    }
    
    // 验证必填字段
    if (!formData.companyName.trim()) {
      alert('公司名称不能为空');
      return;
    }
    
    // 验证联系人姓名
    const invalidContact = contacts.find(contact => contact.name && !contact.name.trim());
    if (invalidContact) {
      alert('联系人姓名不能为空');
      return;
    }
    
    setIsSubmitting(true);
    
    // 准备提交的数据
    const submitData = {
      ...formData,
      companyName: formData.companyName.trim(),
      enterpriseScale: formData.enterpriseScale || null,
      country: formData.country || null,
      establishDate: formData.establishDate ? formData.establishDate : null,
      address: formData.address || null,
      regCapital: formData.regCapital || null,
      industry: formData.industry || null,
      employeeCount: formData.employeeCount || null,
      notes: formData.notes || null,
      fax: formData.fax || null,
      website: formData.website || null,
      email: formData.email || null,
      socialMedia: formData.socialMedia || null,
      contactAddress: formData.contactAddress || null,
      contacts: contacts
        .filter(contact => contact.name.trim()) // 只提交有姓名的联系人
        .map(contact => ({
          name: contact.name.trim(),
          position: contact.position || null,
          email: contact.email || null,
          whatsapp: contact.whatsapp || null,
          phone: contact.phone || null,
          remarks: contact.remarks || null,
        })),
    };
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        logActivity('customer_added', result.data?.id);
        alert('客户创建成功');
        router.push('/customers');
      } else {
        alert(`创建失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('创建客户失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">新增客户</h1>
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

      <div>
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
          <button
            type="button"
            className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'contacts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('contacts')}
          >
            联系人管理
          </button>
        </div>
        
        {/* 基本信息标签页 */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">基本信息</h2>
            
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
                  className={`w-full px-3 py-2 border rounded-lg ${companyNameExists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="请输入公司名称，将自动查重"
                />
                {isChecking && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              {companyNameExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {duplicateMessage}
                </p>
              )}
              {!companyNameExists && formData.companyName.length >= 2 && !isChecking && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <CheckCircle size={16} className="mr-1" />
                  公司名称可用
                </p>
              )}
              {formData.companyName.length > 0 && formData.companyName.length < 2 && (
                <p className="mt-1 text-sm text-gray-500">
                  继续输入以检查公司名称是否重复
                </p>
              )}
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
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  value={formData.country && ['中国', '美国', '日本', '德国', '法国', '英国', '韩国', '印度', '巴西', '俄罗斯'].includes(formData.country) ? formData.country : '其他'}
                  onChange={(e) => {
                    if (e.target.value === '其他') {
                      setFormData(prev => ({ ...prev, country: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, country: e.target.value }));
                    }
                  }}
                >
                  <option value="">请选择国家</option>
                  <option value="中国">中国</option>
                  <option value="美国">美国</option>
                  <option value="日本">日本</option>
                  <option value="德国">德国</option>
                  <option value="法国">法国</option>
                  <option value="英国">英国</option>
                  <option value="韩国">韩国</option>
                  <option value="印度">印度</option>
                  <option value="巴西">巴西</option>
                  <option value="俄罗斯">俄罗斯</option>
                  <option value="其他">其他（请输入）</option>
                </select>
                {formData.country && !['中国', '美国', '日本', '德国', '法国', '英国', '韩国', '印度', '巴西', '俄罗斯'].includes(formData.country) && (
                  <input
                    type="text"
                    name="country"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="请输入国家名称"
                  />
                )}
              </div>
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
            
            {/* 备注信息 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">备注信息</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="请输入备注信息"
              />
            </div>
          </div>
        )}
        
        {/* 联系方式标签页 */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">联系方式</h2>
            
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
        
        {/* 联系人管理标签页 */}
        {activeTab === 'contacts' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
              <h2 className="text-lg font-semibold">联系人管理</h2>
              <Button
                type="button"
                onClick={addContact}
                icon={<Plus size={16} />}
                className="w-full md:w-auto"
              >
                添加联系人
              </Button>
            </div>
            
            {contacts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无联系人，点击"添加联系人"按钮添加</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => removeContact(contact.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="删除联系人"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <h3 className="font-medium text-gray-700 mb-3">联系人 {index + 1}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">姓名 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.name}
                          onChange={(e) => handleContactChange(contact.id, 'name', e.target.value)}
                          placeholder="请输入联系人姓名"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">职位</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.position}
                          onChange={(e) => handleContactChange(contact.id, 'position', e.target.value)}
                          placeholder="请输入职位"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">邮箱</label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.email}
                          onChange={(e) => handleContactChange(contact.id, 'email', e.target.value)}
                          placeholder="请输入邮箱"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">WhatsApp</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.whatsapp}
                          onChange={(e) => handleContactChange(contact.id, 'whatsapp', e.target.value)}
                          placeholder="请输入WhatsApp号码"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">电话</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(contact.id, 'phone', e.target.value)}
                          placeholder="请输入电话"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">备注</label>
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          value={contact.remarks}
                          onChange={(e) => handleContactChange(contact.id, 'remarks', e.target.value)}
                          placeholder="请输入备注"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 提交按钮 */}
        <div className="flex flex-col md:flex-row gap-2">
          <Button 
            type="submit" 
            icon={isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? '保存中...' : '保存客户'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/customers')}
            className="w-full md:w-auto"
          >
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
