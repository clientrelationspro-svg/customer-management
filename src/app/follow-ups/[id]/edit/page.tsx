'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, AlertCircle } from 'lucide-react';
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
  phone?: string;
  email?: string;
  whatsapp?: string;
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
  contact?: { id: string; name: string; phone?: string; email?: string; whatsapp?: string };
}

function EditFollowUpPageContent() {
  const router = useRouter();
  const params = useParams();
  const followUpId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
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
  });

  useEffect(() => {
    fetchCustomers();
    if (followUpId) {
      fetchFollowUp(followUpId);
    }
  }, [followUpId]);

  // 话术发送后直接更新表单日期
  const handleScriptDateUpdated = (lastFollowUpDate: string, nextFollowUpDate: string) => {
    const lastDate = lastFollowUpDate ? new Date(lastFollowUpDate).toISOString().split('T')[0] : '';
    setFormData(prev => ({
      ...prev,
      lastFollowUpDate: lastDate || prev.lastFollowUpDate,
      nextFollowUpDate: nextFollowUpDate || prev.nextFollowUpDate,
    }));
  };

  useEffect(() => {
    if (formData.customerId) {
      fetchContacts(formData.customerId);
    } else {
      setContacts([]);
    }
  }, [formData.customerId]);

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

  const fetchFollowUp = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/follow-ups/${id}`);
      if (res.ok) {
        const data: FollowUp = await res.json();
        setFormData({
          customerId: data.customerId,
          contactId: data.contactId || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          followUpMatters: data.followUpMatters.split(','),
          contactMethod: data.contactMethod,
          nextAction: data.nextAction || '',
          priority: data.priority,
          status: data.status,
          lastFollowUpDate: data.lastFollowUpDate ? new Date(data.lastFollowUpDate).toISOString().split('T')[0] : '',
          nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate).toISOString().split('T')[0] : '',
          remarks: data.remarks || '',
        });
      }
    } catch (error) {
      console.error('Error fetching follow-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('请选择客户');
      return;
    }
    
    if (formData.followUpMatters.length === 0) {
      alert('请选择跟进事宜');
      return;
    }
    
    if (!formData.contactMethod) {
      alert('请选择联系方式');
      return;
    }
    
    if (!formData.lastFollowUpDate) {
      alert('请填写上次跟进日期');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/follow-ups');
      } else {
        const error = await res.json();
        alert(error.error || '更新失败');
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMatterChange = (matter: string) => {
    setFormData((prev) => {
      const matters = prev.followUpMatters.includes(matter)
        ? prev.followUpMatters.filter(m => m !== matter)
        : [...prev.followUpMatters, matter];
      return { ...prev, followUpMatters: matters };
    });
  };

  const handleContactChange = (contactId: string) => {
    setFormData(prev => ({ ...prev, contactId }));
    
    // Auto-fill contact info
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setFormData(prev => ({
          ...prev,
          phone: contact.phone || prev.phone,
          email: contact.email || prev.email,
          whatsapp: contact.whatsapp || prev.whatsapp,
        }));
      }
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/follow-ups');
      }
    } catch (error) {
      console.error('Error deleting follow-up:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">编辑跟进</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主表单 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    客户 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择客户</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系人
                  </label>
                  <select
                    name="contactId"
                    value={formData.contactId}
                    onChange={(e) => handleContactChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择联系人（可选）</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      电话
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入电话"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入WhatsApp"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入邮箱"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">跟进信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    跟进事宜 <span className="text-red-500">*</span>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系方式 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="contactMethod"
                    value={formData.contactMethod}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择联系方式</option>
                    <option value="phone">电话</option>
                    <option value="email">邮件</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="wechat">微信</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    下一步动作
                  </label>
                  <input
                    type="text"
                    name="nextAction"
                    value={formData.nextAction}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入下一步动作"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      跟进优先级
                    </label>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      跟进状态
                    </label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上次跟进日期 <span className="text-red-500">*</span>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      下次跟进日期
                    </label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入备注信息"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* 侧边栏 - 操作按钮 */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">操作</h3>
              <div className="space-y-3">
                <Button type="submit" loading={saving} className="w-full">
                  <Save className="w-5 h-5 mr-2" />
                  保存更改
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  删除跟进
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

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">提示</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 带 <span className="text-red-500">*</span> 的为必填项</p>
                <p>• 选择联系人后可自动填充联系方式</p>
                <p>• 设置下次跟进日期可避免逾期</p>
              </div>
            </Card>
          </div>
        </div>
      </form>

      {/* 跟进话术模块 */}
      <div className="mt-6">
        <FollowUpScripts
          customerId={formData.customerId}
          followUpId={followUpId}
          customerPhone={formData.phone}
          customerEmail={formData.email}
          customerWhatsapp={formData.whatsapp}
          currentNextFollowUpDate={formData.nextFollowUpDate}
          onDateUpdated={handleScriptDateUpdated}
        />
      </div>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="删除跟进记录"
        message="确定要删除这条跟进记录吗？此操作不可撤销。"
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
