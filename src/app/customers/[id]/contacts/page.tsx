'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, User, Upload } from 'lucide-react';
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
  const [keyContactId, setKeyContactId] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [importing, setImporting] = useState(false);
  
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
        setKeyContactId(customerResult.data.keyContactId || '');
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

  // 设置关键联系人 — 自动同步联系方式到客户字段
  const setKeyContact = async (contactId: string) => {
    const newKeyId = contactId === keyContactId ? '' : contactId;
    const contact = contacts.find(c => c.id === contactId);
    try {
      const body: any = { keyContactId: newKeyId || null };
      if (newKeyId && contact) {
        if (contact.phone) body.phone = contact.phone;
        if (contact.email) body.email = contact.email;
        if (contact.whatsapp) body.whatsapp = contact.whatsapp;
      }
      await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setKeyContactId(newKeyId);
      fetchData();
    } catch (error) {
      console.error('Error setting key contact:', error);
    }
  };
  
  // 批量导入联系人
  const handleBatchImport = async () => {
    if (!batchText.trim()) {
      alert('请粘贴联系人数据');
      return;
    }
    setImporting(true);
    try {
      // 解析文本：每行一个联系人，字段用空格/tab/逗号分隔
      const lines = batchText.trim().split('\n').filter(l => l.trim());
      // 检测分隔符
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(',')) delimiter = ',';
      else if (firstLine.includes('  ')) delimiter = '  ';
      else delimiter = ' ';

      let successCount = 0;
      for (const line of lines) {
        const parts = line.split(delimiter).map(p => p.trim()).filter(Boolean);
        if (parts.length < 1) continue;
        
        const name = parts[0] || '';
        const position = parts[1] || '';
        const phone = parts[2] || '';
        const whatsapp = parts[3] || '';
        const email = parts[4] || '';
        const remarks = parts[5] || '';

        if (!name) continue;

        try {
          await fetch(`/api/customers/${customerId}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, position, phone, whatsapp, email, remarks }),
          });
          successCount++;
        } catch {}
      }
      
      alert(`成功导入 ${successCount} 个联系人`);
      setShowBatchImport(false);
      setBatchText('');
      fetchData();
    } catch (error) {
      console.error('Error batch importing:', error);
      alert('导入失败');
    } finally {
      setImporting(false);
    }
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBatchImport(!showBatchImport)} disabled={importing}>
            <Upload size={16} className="mr-1" /> 批量导入
          </Button>
          <Button onClick={addContact} icon={<Plus size={16} />}>
            添加联系人
          </Button>
        </div>
      </div>

      {/* 批量导入区域 */}
      {showBatchImport && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-blue-900">批量导入联系人</h3>
            <button onClick={() => setShowBatchImport(false)} className="p-1 hover:bg-blue-100 rounded"><X size={16} /></button>
          </div>
          <p className="text-xs text-blue-700 mb-2">
            每行一个联系人，格式：姓名 职位 电话 WhatsApp 邮箱 备注（用 Tab/逗号/空格分隔）
          </p>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono focus:border-blue-500"
            placeholder={`张三\t经理\t+86-139-0000-0000\t+86-139-0000-0000\tzhang@example.com\t备注信息
李四\t销售\t+86-138-0000-0000\t+86-138-0000-0000\tli@example.com\t
王五\t技术\t+86-137-0000-0000\t+86-137-0000-0000\twang@example.com\t`}
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleBatchImport} loading={importing} className="text-sm">
              开始导入
            </Button>
            <Button variant="secondary" onClick={() => { setShowBatchImport(false); setBatchText(''); }}>
              取消
            </Button>
          </div>
        </div>
      )}
      
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
                      <div className="flex items-center gap-2">
                        {/* 关键联系人星标按钮 */}
                        <button
                          onClick={() => setKeyContact(contact.id)}
                          className={`p-0.5 rounded transition-colors ${contact.id === keyContactId ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                          title={contact.id === keyContactId ? '当前关键联系人，点击取消' : '设为关键联系人'}
                        >
                          <svg className="w-5 h-5" fill={contact.id === keyContactId ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-semibold">{contact.name}</h3>
                        {contact.id === keyContactId && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">关键联系人</span>
                        )}
                      </div>
                      {contact.position && (
                        <p className="text-sm text-gray-500 ml-7">{contact.position}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 ml-7 text-xs text-gray-400">
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
                  
                  <div className="space-y-2 text-sm ml-7">
                    {contact.whatsapp && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">WhatsApp：</span>
                        <a
                          href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:underline"
                        >
                          {contact.whatsapp}
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      </div>
                    )}
                    
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">邮箱：</span>
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          {contact.email} ✉
                        </a>
                      </div>
                    )}
                    
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-16">电话：</span>
                        <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          {contact.phone} 📞
                        </a>
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
