'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
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
    keyContactId: '',
    status: 'active',
  });

  // 联系人列表（用于关键联系人选择）
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  
  // 查重相关状态
  const [companyNameExists, setCompanyNameExists] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('basic');
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
          status: customer.status || 'active',
        });
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
  
  // 查重函数（编辑时排除当前客户ID）
  const checkCompanyNameDuplicate = useCallback(async (companyName: string) => {
    if (!companyName || companyName.length < 2) {
      setCompanyNameExists(false);
      setDuplicateMessage('');
      return;
    }
    
    setIsChecking(true);
    try {
      const response = await fetch(`/api/customers/check-duplicate?companyName=${encodeURIComponent(companyName)}&excludeId=${customerId}`);
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
  }, [customerId]);
  
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
    
    setIsSubmitting(true);
    
    try {
      // 准备提交的数据
      const submitData = {
        companyName: formData.companyName.trim(),
        enterpriseScale: formData.enterpriseScale || null,
        country: formData.country || null,
        establishDate: formData.establishDate ? formData.establishDate : null,
        address: formData.address || null,
        regCapital: formData.regCapital || null,
        industry: formData.industry || null,
        employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
        notes: formData.notes || null,
        phone: formData.phone || null,
        fax: formData.fax || null,
        website: formData.website || null,
        email: formData.email || null,
        socialMedia: formData.socialMedia || null,
        contactAddress: formData.contactAddress || null,
        keyContactId: formData.keyContactId || null,
        status: formData.status,
      };
      
      // 更新客户基本信息
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '更新客户失败');
      }
      
      alert('客户更新成功');
      router.push(`/customers/${customerId}`);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      alert(`更新失败: ${error.message || '未知错误'}`);
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">编辑客户</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* 标签页导航 */}
        <div className="flex border-b mb-6">
          <button
            type="button"
            className={`px-4 py-2 font-medium ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-medium ${activeTab === 'contact' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('contact')}
          >
            联系方式
          </button>
        </div>
        
        {/* 基本信息标签页 */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
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
            </div>
            
            {/* 企业规模 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">企业规模</label>
              <select
                name="enterpriseScale"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.enterpriseScale}
                onChange={handleInputChange}
              >
                <option value="">请选择企业规模</option>
                <option value="微型企业">微型企业</option>
                <option value="小型企业">小型企业</option>
                <option value="中型企业">中型企业</option>
                <option value="大型企业">大型企业</option>
                <option value="跨国企业">跨国企业</option>
              </select>
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
                type="date"
                name="establishDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.establishDate}
                onChange={handleInputChange}
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
              />
            </div>
            
            {/* 员工人数 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">员工人数</label>
              <input
                type="number"
                name="employeeCount"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.employeeCount}
                onChange={handleInputChange}
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
              />
            </div>
          </div>
        )}
        
        {/* 联系方式标签页 */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
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
              />
            </div>
          </div>
        )}
        
        {/* 提交按钮 */}
        <div className="flex gap-2">
          <Button 
            type="submit" 
            icon={isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            disabled={isSubmitting || companyNameExists}
          >
            {isSubmitting ? '保存中...' : '保存修改'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/customers/${customerId}`)}
          >
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
