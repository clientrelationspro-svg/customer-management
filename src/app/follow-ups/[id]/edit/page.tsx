'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, AlertCircle, Sparkles, Copy, Upload, Download, CheckCircle, X, Send, ChevronDown, ChevronUp, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import FollowUpScripts from '@/components/follow-up/FollowUpScripts';

interface Customer {
  id: string;
  companyName: string;
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  remarks?: string;
}

interface FollowUp {
  id: string;
  customerId: string;
  contactId?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  followUpMatters: string;
  contactMethod: string;
  nextAction?: string;
  priority: string;
  status: string;
  lastFollowUpDate: string;
  nextFollowUpDate?: string;
  remarks?: string;
  customer: { id: string; companyName: string };
  contact?: { id: string; name: string; position?: string; phone?: string; email?: string; whatsapp?: string };
}

function EditFollowUpPageContent() {
  const router = useRouter();
  const params = useParams();
  const followUpId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scriptRefreshKey, setScriptRefreshKey] = useState(0);
  
  // AI话术面板
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiScriptCounts, setAiScriptCounts] = useState({ whatsapp: 2, email: 2, phone: 1, wechat: 0 });
  const [aiParagraphCount, setAiParagraphCount] = useState({ whatsapp: 2, email: 3 });
  const [aiWordCount, setAiWordCount] = useState(120);
  const [aiHookCount, setAiHookCount] = useState(3);
  const [aiAngleCount, setAiAngleCount] = useState(2);
  const [aiInsightCount, setAiInsightCount] = useState(2);
  const [showAiAdvanced, setShowAiAdvanced] = useState(true);
  const [aiLanguage, setAiLanguage] = useState('zh');
  const [aiTone, setAiTone] = useState('de-ai');
  const [aiRole, setAiRole] = useState('seller');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCopied, setAiCopied] = useState(false);
  const [aiImportText, setAiImportText] = useState('');
  const [aiImporting, setAiImporting] = useState(false);
  const [aiImportResult, setAiImportResult] = useState<any>(null);
  const [userDescription, setUserDescription] = useState('');
  const [aiCustomerInfo, setAiCustomerInfo] = useState<{industry?: string; country?: string; notes?: string}>({});
  const [userSkills, setUserSkills] = useState<Array<{name: string; workflow: string; goals: string; tips?: string}>>([]);
  
  // 需求分析关联
  const [needsData, setNeedsData] = useState<{id: string; category: string; content: string}[]>([]);
  const [selectedNeeds, setSelectedNeeds] = useState<Set<string>>(new Set());
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set()); // 折叠的类别
  const [formData, setFormData] = useState({
    customerId: '',
    contactId: '',
    phone: '',
    whatsapp: '',
    email: '',
    followUpMatters: [] as string[],
    contactMethod: '',
    nextAction: '',
    priority: 'medium',
    status: 'in_progress',
    lastFollowUpDate: '',
    nextFollowUpDate: '',
    remarks: '',
    keyContactId: '',
  });
  
  // 获取客户列表
  useEffect(() => {
    fetchCustomers();
    if (followUpId) {
      fetchFollowUp(followUpId);
    }
  }, [followUpId]);
  
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=100');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  const fetchFollowUp = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/follow-ups/${id}`);
      if (res.ok) {
        const followUp: FollowUp = await res.json();
        setFormData({
          customerId: followUp.customerId || '',
          contactId: followUp.contactId || '',
          phone: followUp.phone || '',
          whatsapp: followUp.whatsapp || '',
          email: followUp.email || '',
          followUpMatters: followUp.followUpMatters ? followUp.followUpMatters.split(',') : [],
          contactMethod: followUp.contactMethod || '',
          nextAction: followUp.nextAction || '',
          priority: followUp.priority || 'medium',
          status: followUp.status || 'in_progress',
          lastFollowUpDate: followUp.lastFollowUpDate ? new Date(followUp.lastFollowUpDate).toISOString().split('T')[0] : '',
          nextFollowUpDate: followUp.nextFollowUpDate ? new Date(followUp.nextFollowUpDate).toISOString().split('T')[0] : '',
          remarks: followUp.remarks || '',
          keyContactId: '',
        });
        
        // 获取联系人列表
        if (followUp.customerId) {
          fetchContacts(followUp.customerId);
        }
      }
    } catch (error) {
      console.error('Error fetching follow-up:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchContacts = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`);
      if (res.ok) {
        const result = await res.json();
        setContacts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleMatterChange = (matter: string) => {
    setFormData(prev => {
      const matters = prev.followUpMatters.includes(matter)
        ? prev.followUpMatters.filter(m => m !== matter)
        : [...prev.followUpMatters, matter];
      return { ...prev, followUpMatters: matters };
    });
  };
  
  const handleContactChange = (contactId: string) => {
    setFormData(prev => ({ ...prev, contactId }));
    
    // 自动填充联系方式
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setFormData(prev => ({
          ...prev,
          contactId,
          phone: contact.phone || prev.phone,
          email: contact.email || prev.email,
          whatsapp: contact.whatsapp || prev.whatsapp,
        }));
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('请选择客户');
      return;
    }
    
    const isArchived = formData.status === 'archived';
    
    if (!isArchived) {
      if (formData.followUpMatters.length === 0) {
        alert('请选择开发事宜');
        return;
      }
      
      if (!formData.contactMethod) {
        alert('请选择联系方式');
        return;
      }
      
      if (!formData.lastFollowUpDate) {
        alert('请填写上次开发日期');
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const submitData = {
        ...formData,
        followUpMatters: formData.followUpMatters.join(','),
      };
      
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        alert('开发记录更新成功');
        router.push('/follow-ups');
      } else {
        const error = await res.json();
        alert(error.error || '更新失败');
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert('更新开发记录失败');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        alert('开发记录删除成功');
        router.push('/follow-ups');
      } else {
        const error = await res.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      alert('删除开发记录失败');
    }
  };
  
  // 话术发送后直接更新表单日期
  const handleScriptDateUpdated = (lastFollowUpDate: string, nextFollowUpDate: string) => {
    const lastDate = lastFollowUpDate ? new Date(lastFollowUpDate).toISOString().split('T')[0] : '';
    setFormData(prev => ({
      ...prev,
      lastFollowUpDate: lastDate || prev.lastFollowUpDate,
      nextFollowUpDate: nextFollowUpDate || prev.nextFollowUpDate,
    }));
  };

  // AI话术生成 - 加载需求分析数据
  const loadNeedsForAi = async () => {
    if (!formData.customerId) return;
    try {
      const res = await fetch(`/api/needs-analysis?customerId=${formData.customerId}`);
      const data = await res.json();
      if (data.success) {
        setNeedsData(data.data || []);
        // 默认全选
        setSelectedNeeds(new Set((data.data || []).map((n: any) => n.id)));
      }
    } catch (e) { console.error(e); }
  };

  const toggleNeed = (id: string) => {
    setSelectedNeeds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 打开AI面板时加载需求 + 客户详情
  useEffect(() => {
    if (showAiPanel && formData.customerId) {
      loadNeedsForAi();
      // 加载当前用户业务描述
      fetch('/api/auth/me').then(r => r.json()).then(d => {
        if (d.success) setUserDescription(d.data.description || '');
      }).catch(() => {});
      // 加载完整客户信息
      fetch(`/api/customers/${formData.customerId}`).then(r => r.json()).then(d => {
        if (d.success) setAiCustomerInfo({ industry: d.data.industry, country: d.data.country, notes: d.data.notes });
      }).catch(() => {});
      // 加载员工技能
      fetch('/api/user-skills').then(r => r.json()).then(d => {
        if (d.success) setUserSkills(d.data.filter((s: any) => s.isActive));
      }).catch(() => {});
    }
  }, [showAiPanel]);

  // AI话术生成
  const generateAiPrompt = () => {
    if (!formData.customerId) return;
    const customer = customers.find(c => c.id === formData.customerId);
    const contact = contacts.find(c => c.id === formData.contactId);
    const totalScripts = aiScriptCounts.whatsapp + aiScriptCounts.email + aiScriptCounts.phone + aiScriptCounts.wechat;
    if (totalScripts === 0) return;
    
    let types = [];
    if (aiScriptCounts.whatsapp > 0) types.push(`WhatsApp ${aiScriptCounts.whatsapp} 条`);
    if (aiScriptCounts.email > 0) types.push(`邮件 ${aiScriptCounts.email} 条`);
    if (aiScriptCounts.phone > 0) types.push(`电话 ${aiScriptCounts.phone} 条`);
    if (aiScriptCounts.wechat > 0) types.push(`微信 ${aiScriptCounts.wechat} 条`);

    // 收集选中的需求分析
    const selectedData = needsData.filter(n => selectedNeeds.has(n.id));
    const selectedReqs = selectedData.filter(n => n.category === 'product_requirement').map(n => `- ${n.content}`).join('\n');
    const selectedAngles = selectedData.filter(n => n.category === 'cooperation_angle').map(n => `- ${n.content}`).join('\n');
    const selectedHooks = selectedData.filter(n => n.category === 'hook').map(n => n.content).join('、');

    let needsSection = '';
    if (selectedReqs) needsSection += `\n### 产品需求\n${selectedReqs}`;
    if (selectedAngles) needsSection += `\n### 合作切入点\n${selectedAngles}`;
    if (selectedHooks) needsSection += `\n### 话术钩子（必须在话术中融入以下钩子）\n${selectedHooks}`;

    const langLabel = aiLanguage === 'zh' ? '中文' : aiLanguage === 'en' ? '英文' : aiLanguage === 'es' ? '西班牙文' : '葡萄牙文';
    const toneLabel = aiTone === 'de-ai' ? '去AI化风格' : aiTone === 'friendly' ? '友好亲切风格' : '标准专业风格';
    const roleLabel = aiRole === 'seller' ? '供应商/卖家' : aiRole === 'buyer' ? '采购商/买家' : '中间商/代理商';
    const rolePerspective = aiRole === 'seller' ? '以供应商身份向客户推销产品，强调产品优势、服务能力和合作价值' : aiRole === 'buyer' ? '以采购商身份向供应商询价，体现专业采购需求和对供应商的要求' : '以中间商/代理商身份撮合买卖双方，强调对接能力和资源整合优势';
    const minAngles = selectedAngles ? Math.min(aiAngleCount, selectedData.filter(n => n.category === 'cooperation_angle').length) : 0;
    const minHooks = selectedHooks ? Math.min(aiHookCount, selectedData.filter(n => n.category === 'hook').length) : 0;

    const prompt = `你是一名资深外贸业务专家${userDescription ? `，专注于${userDescription}` : ''}。

## 📋 客户分析
${customer?.companyName ? `**${customer.companyName}**` : '待查'}${aiCustomerInfo.industry ? ` — ${aiCustomerInfo.industry}行业` : ''}${aiCustomerInfo.country ? `，位于${aiCustomerInfo.country}` : ''}
${contact ? `\n- 对接人：${contact.name}${contact.position ? `（${contact.position}）` : ''}` : ''}${formData.phone ? `\n- 电话：${formData.phone}` : ''}${formData.whatsapp ? `\n- WhatsApp：${formData.whatsapp}` : ''}${formData.email ? `\n- 邮箱：${formData.email}` : ''}${aiCustomerInfo.notes ? `\n- 备注：${aiCustomerInfo.notes}` : ''}

${aiCustomerInfo.industry || aiCustomerInfo.country ? `## 🔍 深度洞察要求
在生成每条话术之前，请先分析：
${aiCustomerInfo.industry ? `- 该客户所在${aiCustomerInfo.industry}行业的核心关注点、痛点、采购周期和决策习惯` : ''}${aiCustomerInfo.country ? `\n- ${aiCustomerInfo.country}市场的商业文化特点、沟通偏好和谈判风格` : ''}
- 将这些洞察自然地融入话术中，而非生硬堆砌信息` : ''}

${userSkills.length > 0 ? `## 👤 我的工作风格
请按照以下工作方法和目标来生成话术：
${userSkills.map(s => `### ${s.name}
- 工作流程：${s.workflow}
- 目标：${s.goals}${s.tips ? `\n- 技巧：${s.tips}` : ''}`).join('\n\n')}
` : ''}

## 🎯 当前开发
- 开发事项：${formData.followUpMatters.join('、')}
${formData.nextAction ? `- 下一步动作：${formData.nextAction}` : ''}${formData.remarks ? `\n- 备注：${formData.remarks}` : ''}${needsSection}

## ⚙️ 严格生成参数

**以下参数必须严格遵守，每条话术独立按照以下规格生成：**

| 参数 | 要求 |
|------|------|
| 语言 | **全部使用${langLabel}** |
| 用户角色 | **${roleLabel}** — ${rolePerspective} |
| 语气 | **${toneLabel}**${aiTone === 'de-ai' ? ' — 像真人业务员一样直接自然，避免AI套话' : aiTone === 'friendly' ? ' — 温暖真诚，适度用emoji' : ' — 专业简洁，有力不僵硬'} |
${aiScriptCounts.whatsapp > 0 ? `| WhatsApp | **${aiScriptCounts.whatsapp}条**，每条**${aiParagraphCount.whatsapp}段**，每段**${aiWordCount}±20字** |` : ''}${aiScriptCounts.email > 0 ? `\n| 邮件 | **${aiScriptCounts.email}条**，每条固定**3段式**\n- 第1段：开场+建立联系（${aiWordCount}±20字）\n- 第2段：核心内容+价值主张（${Math.round(aiWordCount*1.5)}±30字）\n- 第3段：行动号召+礼貌结尾（${aiWordCount}±20字） |` : ''}${aiScriptCounts.phone > 0 ? `\n| 电话 | **${aiScriptCounts.phone}条**，结构化口语脚本 |` : ''}${aiScriptCounts.wechat > 0 ? `\n| 微信 | **${aiScriptCounts.wechat}条** |` : ''}
${selectedAngles ? `\n| 切入点 | 至少使用 **${minAngles}个** 合作切入点 |` : ''}${selectedHooks ? `\n| 钩子 | 至少融入 **${minHooks}个** 话术钩子 |` : ''}
| 深度洞见 | 融入 ${aiInsightCount}个行业/市场洞察 |

## 输出格式 - 严格遵守

每条话术用以下结构化格式，之间用 --- 分隔：

=== 新增话术 ===
type: "whatsapp"
title: "产品介绍"
content: Hi John，了解到贵司在电子元器件采购方面的需求，我们公司专注于高品质PCB板制造...

---

=== 新增话术 ===
type: "email"
title: "正式报价"
content: Dear John，
Thank you for your inquiry regarding our products.
Please find the quotation attached.

---

=== 新增话术 ===
type: "phone"
title: "开发确认"
content: 1. 确认客户是否收到报价邮件
2. 了解客户对价格的反馈

type可选值：whatsapp, email, phone, wechat
禁止：代码块、开场白、编号、解释`;

    setAiPrompt(prompt);
  };

  const copyAiPrompt = async () => {
    try { await navigator.clipboard.writeText(aiPrompt); setAiCopied(true); setTimeout(() => setAiCopied(false), 2000); } catch {}
  };

  const updateAiCount = (type: string, delta: number) => {
    setAiScriptCounts(prev => ({ ...prev, [type]: Math.max(0, Math.min(20, (prev as any)[type] + delta)) }));
  };

  const handleAiImport = async () => {
    if (!formData.customerId || !aiImportText.trim()) return;
    setAiImporting(true); setAiImportResult(null);
    try {
      const res = await fetch('/api/ai-analysis/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: formData.customerId, text: aiImportText }),
      });
      const data = await res.json();
      setAiImportResult(data);
      if (data.success) {
        setAiImportText('');
        setScriptRefreshKey(k => k + 1); // 刷新话术列表
      }
    } finally { setAiImporting(false); }
  };
  
  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }
  
  const isArchived = formData.status === 'archived';

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isArchived ? '预览开发（已归档）' : '编辑开发'}</h1>
        {isArchived && (
          <span className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">仅可修改开发状态</span>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主表单 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold mb-4">基本信息</h2>
              
              {/* 客户选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  客户 <span className="text-red-500">*</span>
                </label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={(e) => {
                    handleChange(e);
                    if (e.target.value) fetchContacts(e.target.value);
                  }}
                  required={!isArchived}
                  disabled={isArchived}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 联系人选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">联系人（可选）</label>
                <select
                  name="contactId"
                  value={formData.contactId}
                  onChange={(e) => handleContactChange(e.target.value)}
                  disabled={isArchived}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">请选择联系人（可选）</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 联系方式 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">电话</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isArchived}
                    placeholder="请输入电话"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    disabled={isArchived}
                    placeholder="请输入WhatsApp"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">邮箱</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isArchived}
                    placeholder="请输入邮箱"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            </Card>
            
            <Card>
              <h2 className="text-xl font-semibold mb-4">开发信息</h2>
              
              {/* 开发事宜 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  开发事宜 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['开发', '报价', '样品', '谈判', '成交', '其他'].map((matter) => (
                    <label key={matter} className={`flex items-center gap-2 p-3 border border-gray-200 rounded-lg ${isArchived ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        disabled={isArchived}
                        checked={formData.followUpMatters.includes(matter)}
                        onChange={() => handleMatterChange(matter)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className={`text-sm font-medium ${isArchived ? 'text-gray-400' : 'text-gray-700'}`}>{matter}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 联系方式 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  联系方式 <span className="text-red-500">*</span>
                </label>
                <select
                  name="contactMethod"
                  value={formData.contactMethod}
                  onChange={handleChange}
                  required={!isArchived}
                  disabled={isArchived}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">请选择联系方式</option>
                  <option value="phone">电话</option>
                  <option value="email">邮件</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="wechat">微信</option>
                  <option value="other">其他</option>
                </select>
              </div>
              
              {/* 上次开发日期 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">上次开发日期</label>
                <input
                  type="date"
                  name="lastFollowUpDate"
                  value={formData.lastFollowUpDate}
                  onChange={handleChange}
                  disabled={isArchived}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">发送话术时自动更新</p>
              </div>

              {/* 下次开发日期 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">下次开发日期</label>
                <input
                  type="date"
                  name="nextFollowUpDate"
                  value={formData.nextFollowUpDate}
                  onChange={handleChange}
                  disabled={isArchived}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">避免逾期开发</p>
              </div>

              {/* 下一步动作 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">下一步动作</label>
                <input
                  type="text"
                  name="nextAction"
                  value={formData.nextAction}
                  onChange={handleChange}
                  disabled={isArchived}
                  placeholder="请输入下一步动作"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* 备注资料 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注资料
                  <span className="text-xs text-gray-400 ml-2">存放复制粘贴的有价值内容，将作为AI提示词素材</span>
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  disabled={isArchived}
                  rows={4}
                  placeholder="粘贴客户背景资料、沟通记录、会议纪要、网页链接等有价值的内容..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y min-h-[80px] disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* 开发优先级 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">开发优先级</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  disabled={isArchived}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              
              {/* 开发状态 — 始终可编辑 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">开发状态</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="archived">已归档</option>
                </select>
                {isArchived && (
                  <p className="text-xs text-amber-600 mt-1">当前已归档，修改状态后可恢复编辑</p>
                )}
              </div>
            </Card>
          </div>
          
          {/* 侧边栏 - 操作按钮 */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold mb-4">操作</h3>
              <div className="space-y-3">
                <Button type="submit" loading={saving} className="w-full">
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? '保存中...' : isArchived ? '保存状态' : '保存更改'}
                </Button>
                {!isArchived && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    删除开发
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/follow-ups')}
                  className="w-full"
                >
                  返回
                </Button>
              </div>
            </Card>
            
            <Card>
              <h3 className="text-lg font-semibold mb-4">提示</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 带 <span className="text-red-500">*</span> 的为必填项</p>
                <p>• 选择联系人后可自动填充联系方式</p>
                <p>• 设置下次开发日期可避免逾期</p>
              </div>
            </Card>
          </div>
        </div>
      </form>
      
      {/* AI话术助手 */}
      <div className="mt-6">
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">AI 话术助手</span>
              <span className="text-xs text-gray-400">· 智能生成多条话术并批量导入</span>
            </div>
            {showAiPanel ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          {showAiPanel && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-purple-100 pt-4">
              {/* 左侧：生成设置 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">生成设置 & AI提示词</p>
                
                {/* 话术数量 */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    { k: 'whatsapp', l: 'WhatsApp', c: 'bg-green-50 text-green-700' },
                    { k: 'email', l: '邮件', c: 'bg-orange-50 text-orange-700' },
                    { k: 'phone', l: '电话', c: 'bg-blue-50 text-blue-700' },
                    { k: 'wechat', l: '微信', c: 'bg-teal-50 text-teal-700' },
                  ].map(t => (
                    <div key={t.k} className={`p-1.5 rounded text-center ${t.c}`}>
                      <p className="text-xs">{t.l}</p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <button onClick={() => updateAiCount(t.k, -1)} className="w-4 h-4 rounded bg-white/50 text-xs leading-none">−</button>
                        <span className="text-xs font-bold">{(aiScriptCounts as any)[t.k]}</span>
                        <button onClick={() => updateAiCount(t.k, 1)} className="w-4 h-4 rounded bg-white/50 text-xs leading-none">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 高级设置 */}
                <div className="mb-3">
                  <button onClick={() => setShowAiAdvanced(!showAiAdvanced)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                    {showAiAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    高级设置（段落/字数/钩子数）
                  </button>
                  {showAiAdvanced && (
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg space-y-2 text-xs">
                      {/* 邮件语言 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">邮件语言</span>
                        <select value={aiLanguage} onChange={e => setAiLanguage(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded">
                          <option value="zh">中文</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="pt">Português</option>
                        </select>
                      </div>
                      {/* 语气 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">语气风格</span>
                        <select value={aiTone} onChange={e => setAiTone(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded">
                          <option value="de-ai">去AI化</option>
                          <option value="friendly">友好语气</option>
                          <option value="standard">标准语气</option>
                        </select>
                      </div>
                      {/* 用户角色 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">用户角色</span>
                        <select value={aiRole} onChange={e => setAiRole(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded">
                          <option value="seller">卖家/供应商</option>
                          <option value="buyer">买家/采购商</option>
                          <option value="middleman">中间商/代理</option>
                        </select>
                      </div>
                      {/* WhatsApp 段落数 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">WhatsApp 段落数</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAiParagraphCount(p => ({ ...p, whatsapp: Math.max(1, p.whatsapp - 1) }))}
                            className="w-5 h-5 rounded bg-white border text-xs">−</button>
                          <span className="w-5 text-center font-medium">{aiParagraphCount.whatsapp}</span>
                          <button onClick={() => setAiParagraphCount(p => ({ ...p, whatsapp: Math.min(5, p.whatsapp + 1) }))}
                            className="w-5 h-5 rounded bg-white border text-xs">+</button>
                        </div>
                      </div>
                      {/* 邮件段落（固定3段式） */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">邮件段落</span>
                        <span className="text-xs text-gray-400">固定3段式（开篇·正文·结尾）</span>
                      </div>
                      {/* 每段字数 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">每段字数</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAiWordCount(c => Math.max(50, c - 50))}
                            className="w-5 h-5 rounded bg-white border text-xs">−</button>
                          <span className="w-8 text-center font-medium">{aiWordCount}</span>
                          <button onClick={() => setAiWordCount(c => Math.min(500, c + 50))}
                            className="w-5 h-5 rounded bg-white border text-xs">+</button>
                        </div>
                      </div>
                      {/* 切入点数量 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">切入点使用数</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAiAngleCount(c => Math.max(1, c - 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">−</button>
                          <span className="w-5 text-center font-medium">{aiAngleCount}</span>
                          <button onClick={() => setAiAngleCount(c => Math.min(10, c + 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">+</button>
                        </div>
                      </div>
                      {/* 钩子数量 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">钩子使用数</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAiHookCount(c => Math.max(1, c - 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">−</button>
                          <span className="w-5 text-center font-medium">{aiHookCount}</span>
                          <button onClick={() => setAiHookCount(c => Math.min(10, c + 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">+</button>
                        </div>
                      </div>
                      {/* 深度洞见数 */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">深度洞见数</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAiInsightCount(c => Math.max(1, c - 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">−</button>
                          <span className="w-5 text-center font-medium">{aiInsightCount}</span>
                          <button onClick={() => setAiInsightCount(c => Math.min(5, c + 1))}
                            className="w-5 h-5 rounded bg-white border text-xs">+</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 需求分析关联 — 可折叠分类 */}
                {needsData.length > 0 && (
                  <div className="mb-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-600">📋 需求分析素材</p>
                      <button onClick={() => setSelectedNeeds(new Set(needsData.map(n => n.id)))} className="text-xs text-blue-600 hover:underline">全选</button>
                    </div>
                    {['product_requirement', 'cooperation_angle', 'hook'].map(cat => {
                      const items = needsData.filter(n => n.category === cat);
                      if (items.length === 0) return null;
                      const label = cat === 'product_requirement' ? '产品需求' : cat === 'cooperation_angle' ? '合作切入点' : '钩子信息';
                      const catIcon = cat === 'product_requirement' ? '📦' : cat === 'cooperation_angle' ? '🎯' : '🪝';
                      const catBg = cat === 'product_requirement' ? 'bg-blue-50' : cat === 'cooperation_angle' ? 'bg-orange-50' : 'bg-purple-50';
                      const isCollapsed = collapsedCats.has(cat);
                      const selectedCount = items.filter(i => selectedNeeds.has(i.id)).length;
                      return (
                        <div key={cat} className="border-b border-gray-100 last:border-b-0">
                          <button
                            onClick={() => setCollapsedCats(prev => {
                              const next = new Set(prev);
                              if (next.has(cat)) next.delete(cat); else next.add(cat);
                              return next;
                            })}
                            className={`w-full flex items-center justify-between px-3 py-2 ${catBg} hover:opacity-90 transition-opacity`}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                              <span>{catIcon}</span> {label}
                              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                selectedCount > 0 ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'
                              }`}>
                                {selectedCount}/{items.length}
                              </span>
                            </span>
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                          {!isCollapsed && (
                            <div className="px-3 py-1.5 space-y-0.5 max-h-[140px] overflow-y-auto">
                              {items.map(item => (
                                <label key={item.id} className="flex items-center gap-2 py-1 px-1 hover:bg-gray-50 rounded cursor-pointer">
                                  <input type="checkbox" checked={selectedNeeds.has(item.id)} onChange={() => toggleNeed(item.id)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-700 leading-relaxed">{item.content}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button onClick={generateAiPrompt} size="sm" className="w-full bg-purple-600 hover:bg-purple-700 mb-2">
                  <Sparkles className="w-3 h-3 mr-1" /> 生成 AI 提示词
                </Button>

                {aiPrompt && (
                  <>
                    <div className="p-2.5 bg-gray-900 text-gray-100 rounded text-xs font-mono max-h-[200px] overflow-y-auto whitespace-pre-wrap">{aiPrompt}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={copyAiPrompt}><Copy className="w-3 h-3 mr-1" />{aiCopied ? '已复制' : '复制'}</Button>
                      <Button size="sm" variant="secondary" onClick={() => {
                        const blob = new Blob([aiPrompt], {type: 'text/markdown'});
                        const u = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = u; a.download = `ai-prompt-${formData.customerId}.md`;
                        a.click(); URL.revokeObjectURL(u);
                      }}><Download className="w-3 h-3 mr-1" />下载 .md</Button>
                      <a href="https://chat.openai.com" target="_blank" rel="noopener"
                        className="inline-flex items-center px-2.5 py-1.5 bg-green-600 text-white rounded text-xs"><Send className="w-3 h-3 mr-1" />ChatGPT</a>
                    </div>
                  </>
                )}
              </div>

              {/* 右侧：智能导入 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">智能导入 AI 结果</p>
                <p className="text-xs text-gray-500 mb-2">粘贴 AI 生成的话术或上传 .md 文件，自动识别多条话术</p>
                <textarea
                  value={aiImportText}
                  onChange={e => setAiImportText(e.target.value)}
                  rows={8}
                  placeholder={`粘贴AI生成的话术...\n\n=== 新增话术 ===\ntype: "whatsapp"\ntitle: "初次问候"\ncontent: Hi，很高兴与您取得联系...\n\n---\n\n=== 新增话术 ===\ntype: "email"\ntitle: "产品报价"\ncontent: Dear Customer...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono resize-y"
                />
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    <FileText className="w-3 h-3" />
                    上传 .md 文件
                    <input type="file" accept=".md,.txt,.markdown" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const text = await file.text();
                          setAiImportText(text);
                        }
                      }} />
                  </label>
                  <Button onClick={handleAiImport} loading={aiImporting} disabled={!aiImportText.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Upload className="w-3 h-3 mr-1" /> 导入
                  </Button>
                </div>
                {aiImportResult && (
                  <div className={`mt-2 p-3 rounded text-xs ${aiImportResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <p className="font-medium mb-1">{aiImportResult.message || aiImportResult.error}</p>
                    {aiImportResult.results && aiImportResult.results.length > 0 && (
                      <div className="space-y-0.5 mt-1">
                        {aiImportResult.results.map((r: any, i: number) => (
                          <p key={i} className={r.status === 'created' ? 'text-green-600' : 'text-red-500'}>
                            {r.status === 'created' ? '✅' : '❌'} [{r.type}] {r.title}
                          </p>
                        ))}
                      </div>
                    )}
                    {aiImportResult.hint && <p className="text-gray-500 mt-1">{aiImportResult.hint}</p>}
                    {aiImportResult.debugSample && <p className="text-gray-400 mt-1 font-mono text-xs truncate">输入: {aiImportResult.debugSample}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 跟进话术模块 */}
      <div className="mt-6">
        <FollowUpScripts 
          key={scriptRefreshKey}
          customerId={formData.customerId}
          followUpId={followUpId}
          customerPhone={formData.phone}
          customerEmail={formData.email}
          customerWhatsapp={formData.whatsapp}
          currentNextFollowUpDate={formData.nextFollowUpDate}
          isArchived={isArchived}
          onDateUpdated={handleScriptDateUpdated}
        />
      </div>
      
      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="删除开发记录"
        message="确定要删除此开发记录吗？此操作不可撤销。"
        danger
      />
    </div>
  );
}

export default function EditFollowUpPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <EditFollowUpPageContent />
    </Suspense>
  );
}
