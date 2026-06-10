'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
      employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">新增客户</h1>
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
          <button
            type="button"
            className={`px-4 py-2 font-medium ${activeTab === 'contacts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('contacts')}
          >
            联系人管理
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
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  value={formData.country && ['中国', '美国', '日本', '德国', '法国', '英国', '韩国', '印度', '巴西', '俄罗斯', '其他'].includes(formData.country) ? formData.country : '其他'}
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
                type="number"
                name="employeeCount"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                value={formData.employeeCount}
                onChange={handleInputChange}
                placeholder="请输入员工人数"
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">联系人管理</h2>
              <Button
                type="button"
                onClick={addContact}
                icon={<Plus size={16} />}
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
        <div className="flex gap-2">
          <Button 
            type="submit" 
            icon={isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            disabled={isSubmitting || companyNameExists}
          >
            {isSubmitting ? '保存中...' : '保存客户'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/customers')}
          >
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
