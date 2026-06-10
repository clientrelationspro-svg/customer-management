'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Contact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  isEditing?: boolean;
  isNew?: boolean;
}

export default function CustomerContactsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customerName, setCustomerName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 获取客户和联系人数据
  useEffect(() => {
    fetchData();
  }, [customerId]);
  
  const fetchData = async () => {
    try {
      // 获取客户信息
      const customerRes = await fetch(`/api/customers/${customerId}`);
      const customerResult = await customerRes.json();
      if (customerResult.success) {
        setCustomerName(customerResult.data.companyName);
      }
      
      // 获取联系人列表
      const contactsRes = await fetch(`/api/customers/${customerId}/contacts`);
      const contactsResult = await contactsRes.json();
      if (contactsResult.success) {
        setContacts(contactsResult.data.map((contact: any) => ({
          ...contact,
          isEditing: false,
          isNew: false,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 添加新联系人
  const addContact = () => {
    const newContact: Contact = {
      id: `new_${Date.now()}`,
      name: '',
      position: '',
      email: '',
      whatsapp: '',
      phone: '',
      remarks: '',
      isEditing: true,
      isNew: true,
    };
    setContacts(prev => [...prev, newContact]);
  };
  
  // 删除联系人
  const deleteContact = async (contact: Contact) => {
    if (!confirm('确定要删除此联系人吗？')) return;
    
    if (contact.isNew) {
      // 新联系人未保存，直接从列表移除
      setContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      // 已存在的联系人，调用API删除
      try {
        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          setContacts(prev => prev.filter(c => c.id !== contact.id));
        } else {
          alert('删除失败：' + (result.error || '未知错误'));
        }
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('删除失败，请稍后重试');
      }
    }
  };
  
  // 开始编辑联系人
  const startEdit = (id: string) => {
    setContacts(prev => prev.map(contact => 
      contact.id === id ? { ...contact, isEditing: true } : contact
    ));
  };
  
  // 取消编辑
  const cancelEdit = (contact: Contact) => {
    if (contact.isNew) {
      // 新联系人取消编辑，直接移除
      setContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      // 已存在的联系人取消编辑，恢复原始数据
      fetchData();
    }
  };
  
  // 保存联系人
  const saveContact = async (contact: Contact) => {
    if (!contact.name.trim()) {
      alert('联系人姓名不能为空');
      return;
    }
    
    setSaving(true);
    try {
      if (contact.isNew) {
        // 创建新联系人
        const response = await fetch(`/api/customers/${customerId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contact.name.trim(),
            position: contact.position || null,
            email: contact.email || null,
            whatsapp: contact.whatsapp || null,
            phone: contact.phone || null,
            remarks: contact.remarks || null,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await fetchData(); // 重新加载数据
        } else {
          alert('保存失败：' + (result.error || '未知错误'));
        }
      } else {
        // 更新现有联系人
        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contact.name.trim(),
            position: contact.position || null,
            email: contact.email || null,
            whatsapp: contact.whatsapp || null,
            phone: contact.phone || null,
            remarks: contact.remarks || null,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await fetchData(); // 重新加载数据
        } else {
          alert('保存失败：' + (result.error || '未知错误'));
        }
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };
  
  // 处理联系人输入变化
  const handleContactChange = (id: string, field: string, value: string) => {
    setContacts(prev => prev.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">联系人管理</h1>
          <p className="text-sm text-gray-500 mt-1">客户：{customerName}</p>
        </div>
        <Button
          onClick={addContact}
          icon={<Plus size={16} />}
        >
          添加联系人
        </Button>
      </div>
      
      {/* 联系人列表 */}
      {contacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">暂无联系人</p>
          <Button
            onClick={addContact}
            icon={<Plus size={16} />}
          >
            添加第一个联系人
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow p-6">
              {contact.isEditing ? (
                // 编辑模式
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        姓名 <span className="text-red-500">*</span>
                      </label>
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
                        value={contact.position || ''}
                        onChange={(e) => handleContactChange(contact.id, 'position', e.target.value)}
                        placeholder="请输入职位"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">邮箱</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        value={contact.email || ''}
                        onChange={(e) => handleContactChange(contact.id, 'email', e.target.value)}
                        placeholder="请输入邮箱"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">WhatsApp</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        value={contact.whatsapp || ''}
                        onChange={(e) => handleContactChange(contact.id, 'whatsapp', e.target.value)}
                        placeholder="请输入WhatsApp号码"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">电话</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        value={contact.phone || ''}
                        onChange={(e) => handleContactChange(contact.id, 'phone', e.target.value)}
                        placeholder="请输入电话"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">备注</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        value={contact.remarks || ''}
                        onChange={(e) => handleContactChange(contact.id, 'remarks', e.target.value)}
                        placeholder="请输入备注"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => cancelEdit(contact)}
                      icon={<X size={16} />}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={() => saveContact(contact)}
                      icon={saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={16} />}
                      disabled={saving}
                    >
                      {saving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                // 查看模式
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{contact.name}</h3>
                      {contact.position && (
                        <p className="text-sm text-gray-500">{contact.position}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {contact.createdAt && (
                          <span>创建: {new Date(contact.createdAt).toLocaleString('zh-CN')}</span>
                        )}
                        {contact.updatedAt && (
                          <span>更新: {new Date(contact.updatedAt).toLocaleString('zh-CN')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(contact.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteContact(contact)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">邮箱：</span>
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    
                    {contact.whatsapp && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">WhatsApp：</span>
                        <span>{contact.whatsapp}</span>
                      </div>
                    )}
                    
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">电话：</span>
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    
                    {contact.remarks && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16">备注：</span>
                        <span className="text-gray-600">{contact.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
