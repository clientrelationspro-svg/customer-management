'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Calendar, AlertCircle, Search, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  companyName: string;
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export default function NewFollowUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // 可搜索客户选择器
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    companyName: '',  // 新建客户时使用
    contactId: '',
    phone: '',
    whatsapp: '',
    email: '',
    followUpMatters: [] as string[],
    contactMethod: '',
    nextAction: '',
    priority: 'medium',
    status: 'in_progress',
    lastFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpDate: '',
    remarks: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 过滤匹配的客户
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c => c.companyName.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;
  const exactMatch = customers.find(c => c.companyName.toLowerCase() === customerSearch.trim().toLowerCase());

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

  // 加载客户基本信息（电话、WhatsApp、邮箱）
  const fetchCustomerInfo = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const c = data.data;
          setFormData(prev => ({
            ...prev,
            phone: c.phone || prev.phone,
            email: c.email || prev.email,
            whatsapp: '', // WhatsApp 通常在联系人上，客户层级不一定有
          }));
        }
      }
    } catch (e) { console.error(e); }
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
    
    if (!formData.customerId && !formData.companyName.trim()) {
      alert('请选择客户或输入新客户公司名称');
      return;
    }
    
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
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        followUpMatters: formData.followUpMatters.join(','),
      };
      
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        alert('开发记录创建成功');
        router.push('/follow-ups');
      } else {
        const error = await res.json();
        alert(`创建失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error creating follow-up:', error);
      alert('创建开发记录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">新建开发</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主表单 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold mb-4">基本信息</h2>
              
              {/* 可搜索客户选择器 */}
              <div className="mb-4" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  客户 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.customerId ? (customers.find(c => c.id === formData.customerId)?.companyName || customerSearch) : customerSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerSearch(val);
                      setShowDropdown(true);
                      // 清除已选
                      if (formData.customerId) {
                        setFormData(prev => ({ ...prev, customerId: '', companyName: val }));
                      } else {
                        setFormData(prev => ({ ...prev, companyName: val }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="搜索或输入新客户名称..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {customerSearch && (
                    <button onClick={() => { setCustomerSearch(''); setFormData(prev => ({ ...prev, customerId: '', companyName: '' })); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 下拉匹配列表 */}
                {showDropdown && customerSearch.trim() && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 && (
                      <div className="py-1">
                        {filteredCustomers.slice(0, 8).map(c => (
                          <button key={c.id} type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, customerId: c.id, companyName: '' }));
                              setCustomerSearch(c.companyName);
                              setShowDropdown(false);
                              fetchCustomerInfo(c.id);
                              fetchContacts(c.id);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${c.companyName === customerSearch.trim() ? 'bg-blue-50' : ''}`}>
                            <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span>{c.companyName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!exactMatch && customerSearch.trim() && (
                      <div className="px-4 py-2 text-sm text-purple-600 border-t border-gray-100 bg-purple-50">
                        ✨ 将创建新客户: <strong>{customerSearch.trim()}</strong>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formData.customerId ? '✅ 已选择已有客户' : customerSearch.trim() ? '将创建新客户并自动填入系统' : '输入客户名称搜索，或输入新名称自动创建'}
                </p>
              </div>

              {/* 联系人选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">联系人（可选）</label>
                <select
                  name="contactId"
                  value={formData.contactId}
                  onChange={(e) => handleContactChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">不选择联系人</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.position ? `(${contact.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 联系方式 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">电话</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="联系电话"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="WhatsApp号码"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">邮箱</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="邮箱地址"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 开发事宜 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  开发事宜 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['开发', '报价', '样品', '谈判', '成交', '其他'].map((matter) => (
                    <label key={matter} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.followUpMatters.includes(matter)}
                        onChange={() => handleMatterChange(matter)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{matter}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 联系方式 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  联系方式 <span className="text-red-500">*</span>
                </label>
                <select
                  name="contactMethod"
                  value={formData.contactMethod}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择联系方式</option>
                  <option value="phone">电话</option>
                  <option value="email">邮件</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="wechat">微信</option>
                  <option value="other">其他</option>
                </select>
              </div>

              {/* 下一步动作 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">下一步动作</label>
                <input
                  type="text"
                  name="nextAction"
                  value={formData.nextAction}
                  onChange={handleChange}
                  placeholder="请输入下一步动作"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 备注资料 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">备注资料 <span className="text-xs text-gray-400 font-normal">AI提示词素材</span></label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={4}
                  placeholder="粘贴客户背景资料、沟通记录、网页链接等有价值内容..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y min-h-[80px]"
                />
              </div>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold mb-4">开发设置</h3>
              
              {/* 开发优先级 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">开发优先级</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              {/* 开发状态 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">开发状态</label>
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
              </div>

              {/* 上次开发日期 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  上次开发日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="lastFollowUpDate"
                  value={formData.lastFollowUpDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 下次开发日期 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">下次开发日期</label>
                <input
                  type="date"
                  name="nextFollowUpDate"
                  value={formData.nextFollowUpDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4">操作</h3>
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  loading={loading}
                  className="w-full"
                >
                  <Save size={20} className="mr-2" />
                  {loading ? '保存中...' : '保存开发'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  className="w-full"
                >
                  取消
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
