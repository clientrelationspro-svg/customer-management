'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Building2, Phone, Mail, Globe, Users, Target, Plus, Upload, X, Save, Sparkles, Copy, FileText, Send, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Customer {
  id: string;
  companyName: string;
  enterpriseScale?: string;
  country?: string;
  establishDate?: string;
  address?: string;
  regCapital?: string;
  industry?: string;
  employeeCount?: string;
  notes?: string;
  phone?: string;
  fax?: string;
  website?: string;
  email?: string;
  socialMedia?: string;
  contactAddress?: string;
  keyContactId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
  orders: Order[];
  files: File[];
  _count?: {
    orders: number;
  };
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  remarks?: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  orderDate: string;
}

interface File {
  id: string;
  originalName: string;
  fileSize: number;
  createdAt: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  useEffect(() => {
    if (customerId) fetchTimeline();
  }, [customerId]);

  const fetchTimeline = async () => {
    try {
      const [emailsRes, followUpsRes] = await Promise.all([
        fetch(`/api/inquiries?limit=50`),
        fetch(`/api/follow-ups?limit=50&customerId=${customerId}`),
      ]);
      const emails = await emailsRes.json();
      const followUps = await followUpsRes.json();

      const items: any[] = [];
      if (emails.success) {
        emails.data.filter((e: any) => e.customerId === customerId || e.fromEmail === customer?.email).forEach((e: any) => {
          items.push({
            type: 'email', id: e.id, date: e.createdAt, subject: e.subject,
            fromName: e.fromName, fromEmail: e.fromEmail, status: e.status,
            aiSummary: e.aiSummary, productInterested: e.productInterested,
          });
        });
      }
      if (followUps.success) {
        (followUps.data || []).forEach((f: any) => {
          items.push({
            type: 'followup', id: f.id, date: f.lastFollowUpDate || f.createdAt,
            contactMethod: f.contactMethod, nextAction: f.nextAction,
            followUpMatters: f.followUpMatters,
          });
        });
      }
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(items.slice(0, 30));
    } catch {}
    finally { setTimelineLoading(false); }
  };

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      if (result.success) {
        setCustomer(result.data);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此客户吗？此操作不可恢复。')) return;

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      lead: 'bg-blue-100 text-blue-800',
    };

    const labels: { [key: string]: string } = {
      active: '活跃',
      inactive: '停用',
      lead: '潜在',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || colors.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8 text-red-500">客户不存在</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{customer.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(customer.status)}
              {customer.industry && (
                <span className="text-sm text-gray-500">{customer.industry}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              <span>创建: {formatDateTime(customer.createdAt)}</span>
              <span>更新: {formatDateTime(customer.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => router.push(`/customers/${customerId}/needs-analysis`)}
            variant="secondary"
            icon={<Target size={18} />}
          >
            AI客户分析
          </Button>
          <Button
            onClick={() => router.push(`/customers/${customerId}/edit`)}
            icon={<Edit size={20} />}
          >
            编辑
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            icon={<Trash2 size={20} />}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">基本信息</h2>
          </div>

          <div className="space-y-3">
            {customer.enterpriseScale && (
              <div>
                <span className="text-sm text-gray-500">企业规模</span>
                <p className="font-medium">{customer.enterpriseScale}</p>
              </div>
            )}

            {customer.country && (
              <div>
                <span className="text-sm text-gray-500">国家</span>
                <p className="font-medium">{customer.country}</p>
              </div>
            )}

            {customer.establishDate && (
              <div>
                <span className="text-sm text-gray-500">成立日期</span>
                <p className="font-medium">{formatDate(customer.establishDate)}</p>
              </div>
            )}

            {customer.regCapital && (
              <div>
                <span className="text-sm text-gray-500">注册资本</span>
                <p className="font-medium">{customer.regCapital}</p>
              </div>
            )}

            {customer.employeeCount !== null && customer.employeeCount !== undefined && (
              <div>
                <span className="text-sm text-gray-500">员工人数</span>
                <p className="font-medium">{customer.employeeCount}</p>
              </div>
            )}

            {customer.address && (
              <div>
                <span className="text-sm text-gray-500">公司地址</span>
                <p className="font-medium">{customer.address}</p>
              </div>
            )}

            {(customer.phone || customer.email || customer.website) && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${customer.phone.replace(/\s/g,'')}`} className="text-blue-600 text-sm hover:underline">{customer.phone}</a>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <a href={`mailto:${customer.email}`} className="text-blue-600 text-sm hover:underline">{customer.email}</a>
                  </div>
                )}
                {customer.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" />
                    <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">{customer.website}</a>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">创建日期</span>
              <p className="font-medium text-sm">{formatDateTime(customer.createdAt)}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">更新日期</span>
              <p className="font-medium text-sm">{formatDateTime(customer.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* 备注信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-amber-600" />
            <h2 className="text-lg font-semibold">备注信息</h2>
          </div>
          {customer.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">暂无备注信息</p>
          )}
        </div>

        {/* 沟通时间线 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold">沟通时间线</h2>
            <span className="text-xs text-gray-400 ml-2">{timeline.length} 条记录</span>
          </div>
          {timelineLoading ? (
            <p className="text-sm text-gray-500">加载中...</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-400">暂无互动记录</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {timeline.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3 pl-2 border-l-2 border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center -ml-[15px] bg-white">
                    {item.type === 'email' ? (
                      <Mail className="w-4 h-4 text-blue-500" />
                    ) : item.contactMethod === 'whatsapp' ? (
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    ) : item.contactMethod === 'phone' ? (
                      <Phone className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 pb-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs text-gray-400">{new Date(item.date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      {item.type === 'email' ? (
                        <span className="text-xs font-medium text-blue-600">📧 邮件</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">
                          {item.contactMethod === 'whatsapp' ? '💬 WhatsApp' : item.contactMethod === 'phone' ? '📞 电话' : item.contactMethod === 'email' ? '📧 邮件' : '📝 其他'}
                        </span>
                      )}
                      {item.status && (() => {
                        const labels: Record<string, string> = { new: '新邮件', processing: '处理中', reviewed: '待回复', replied: '已回复' };
                        return (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.status === 'replied' ? 'bg-green-100 text-green-700' : item.status === 'processing' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {labels[item.status] || item.status}
                          </span>
                        );
                      })()}
                    </div>
                    {item.type === 'email' ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate">{item.subject}</p>
                        {item.aiSummary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.aiSummary}</p>}
                        <p className="text-xs text-gray-400">{item.fromName} &lt;{item.fromEmail}&gt;</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-700">{item.nextAction || item.followUpMatters}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近订单 */}
        {customer.orders && customer.orders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">最近订单</h2>
              <Button onClick={() => router.push('/orders')} size="sm" variant="secondary">查看全部</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b"><th className="text-left p-2">订单号</th><th className="text-left p-2">状态</th><th className="text-left p-2">金额</th><th className="text-left p-2">日期</th></tr></thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2"><button onClick={() => router.push(`/orders/${order.id}`)} className="text-blue-600 hover:underline">{order.orderNo}</button></td>
                      <td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{order.status === 'completed' ? '已完成' : order.status === 'pending' ? '待处理' : order.status}</span></td>
                      <td className="p-2">¥{order.totalAmount.toFixed(2)}</td>
                      <td className="p-2">{formatDate(order.orderDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 联系人管理（嵌入式卡片网格） */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <EmbeddedContacts customerId={customerId} keyContactId={customer?.keyContactId || ''} companyName={customer.companyName} industry={customer.industry} country={customer.country} />
        </div>
      </div>
    </div>
  );
}

// 嵌入式联系人管理组件
function EmbeddedContacts({ customerId, keyContactId: initialKeyId, companyName, industry, country }: { customerId: string; keyContactId: string; companyName: string; industry?: string; country?: string }) {
  interface C { id: string; name: string; position?: string; email?: string; whatsapp?: string; phone?: string; remarks?: string; updatedAt?: string; }
  const [contacts, setContacts] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyId, setKeyId] = useState(initialKeyId);
  const [showAdd, setShowAdd] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', email: '', whatsapp: '', phone: '', remarks: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [batchText, setBatchText] = useState('');
  const [copied, setCopied] = useState(false);

  const aiPromptText = `你是一名专业的外贸客户开发助手。请帮我查找以下公司的员工信息和联系方式。

## 🏢 目标公司
${companyName}${industry ? `\n行业：${industry}` : ''}${country ? `\n国家：${country}` : ''}

## 🔍 搜索渠道
1. LinkedIn：搜索公司名 + 职位关键词（Purchasing Manager, CEO, Sales Director）
2. 公司官网：About Us / Team / Contact Us 页面
3. Google：搜索公司名 + email / contact

## 👤 需要收集的信息（按此顺序，6个字段）
1.姓名 2.职位 3.电话号码 4.WhatsApp 5.邮箱 6.备注

## 📝 输出格式（严格按此格式，用 | 竖线分隔每个字段）

每行一人，格式如下：
姓名 | 职位 | 电话号码 | WhatsApp | 邮箱 | 备注

输出示例：
John Smith | Purchasing Manager | +1-212-555-0100 | +12125550100 | j.smith@company.com | 决策者回复快
Jane Doe | Sales Director | | +12125550200 | j.doe@company.com | LinkedIn找到

规则：
- 用 | 竖线（pipe）分隔6个字段
- 没有的信息留空（如：| |）
- 每行一人，不要表头、不要编号、不要解释文字
- 只输出数据行`;

  const copyAiPrompt = async () => {
    try { await navigator.clipboard.writeText(aiPromptText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const fetchContacts = async () => {
    try {
      const r = await fetch(`/api/customers/${customerId}/contacts`);
      const d = await r.json();
      if (d.success) setContacts(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, [customerId]);

  const saveContact = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await fetch(`/api/contacts/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch(`/api/customers/${customerId}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setForm({ name: '', position: '', email: '', whatsapp: '', phone: '', remarks: '' });
      setEditingId(null); setShowAdd(false); fetchContacts();
    } catch {}
  };

  const deleteContact = async (id: string) => {
    if (!confirm('删除此联系人？')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    fetchContacts();
  };

  const setKeyContact = async (contact: C) => {
    const newKey = contact.id === keyId ? '' : contact.id;
    const body: any = { keyContactId: newKey || null };
    if (newKey) {
      if (contact.phone) body.phone = contact.phone;
      if (contact.email) body.email = contact.email;
      if (contact.whatsapp) body.whatsapp = contact.whatsapp;
    }
    await fetch(`/api/customers/${customerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setKeyId(newKey);
  };

  // 智能字段映射：根据内容特征确定字段位置
  const smartMap = (parts: string[]): { name: string; position: string; phone: string; whatsapp: string; email: string; remarks: string } => {
    const result = { name: '', position: '', phone: '', whatsapp: '', email: '', remarks: '' };
    // 先按位置分配
    if (parts[0]) result.name = parts[0];
    if (parts[1]) result.position = parts[1];
    // 剩余字段按内容特征智能分配
    const rest = parts.slice(2);
    for (const val of rest) {
      if (/@/.test(val)) result.email = val;
      else if (/whatsapp|wa/i.test(val)) result.whatsapp = val.replace(/whatsapp|wa\s*[:：]?\s*/i, '');
      else if (/^\+?\d[\d\s\-\(\)]{6,}$/.test(val)) {
        if (!result.phone) result.phone = val;
        else result.whatsapp = val;
      } else if (val.length > 2) result.remarks = result.remarks ? result.remarks + '; ' + val : val;
    }
    return result;
  };

  const parseLine = (line: string): string[] => {
    // 1. | 竖线分隔（最可靠）
    if (line.includes('|')) {
      return line.split('|').map(p => p.trim()).filter(Boolean);
    }
    // 2. 实际 Tab
    if (line.includes('\t')) {
      return line.split('\t').map(p => p.trim());
    }
    // 3. → 箭头分隔
    if (line.includes('→')) {
      return line.split('→').map(p => p.trim());
    }
    // 4. [TAB] 文字标记
    if (line.includes('[TAB]')) {
      return line.split('[TAB]').map(p => p.trim());
    }
    // 5. 4+ 空格
    if (/\s{4,}/.test(line)) {
      return line.split(/\s{4,}/).map(p => p.trim());
    }
    // 6. 单字段
    return [line.trim()];
  };

  const handleBatch = async () => {
    if (!batchText.trim()) return;
    let success = 0;
    const lines = batchText.split('\n').filter(l => l.trim() && l.trim().length > 3);
    for (const line of lines) {
      const parts = parseLine(line);
      if (parts.length < 1) continue;
      const data = smartMap(parts);
      if (!data.name) continue;
      try {
        await fetch(`/api/customers/${customerId}/contacts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        success++;
      } catch {}
    }
    alert(`成功导入 ${success} 个联系人`);
    setBatchText(''); setShowAiPrompt(false); fetchContacts();
  };

  const startEdit = (c: C) => { setEditingId(c.id); setForm({ name: c.name, position: c.position || '', email: c.email || '', whatsapp: c.whatsapp || '', phone: c.phone || '', remarks: c.remarks || '' }); setShowAdd(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />联系人 ({contacts.length})</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAiPrompt(!showAiPrompt)}><Sparkles className="w-4 h-4 mr-1" />AI提示词</Button>
          <Button size="sm" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm({ name: '', position: '', email: '', whatsapp: '', phone: '', remarks: '' }); }}><Plus className="w-4 h-4 mr-1" />添加</Button>
        </div>
      </div>

      {showAiPrompt && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-900">🤖 AI 员工信息查询提示词</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copyAiPrompt}><Copy className="w-3 h-3 mr-1" />{copied ? '已复制' : '复制'}</Button>
            </div>
          </div>
          <div className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto mb-3">
            {aiPromptText}
          </div>
          <p className="text-xs text-purple-700 mb-2">将 AI 返回的联系人结果粘贴到下方，每行一个联系人（Tab/逗号分隔）</p>
          <textarea value={batchText} onChange={e => setBatchText(e.target.value)} rows={3} className="w-full px-3 py-2 border border-purple-300 rounded text-sm font-mono" placeholder="粘贴 AI 返回的结果..." />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleBatch} disabled={!batchText.trim()}><Upload className="w-3 h-3 mr-1" />导入AI结果</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowAiPrompt(false); setBatchText(''); }}>关闭</Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="姓名 *" className="px-3 py-2 border rounded text-sm" />
            <input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="职位" className="px-3 py-2 border rounded text-sm" />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="邮箱" className="px-3 py-2 border rounded text-sm" />
            <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" className="px-3 py-2 border rounded text-sm" />
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="电话" className="px-3 py-2 border rounded text-sm" />
            <input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} placeholder="备注" className="px-3 py-2 border rounded text-sm" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveContact}><Save className="w-4 h-4 mr-1" />{editingId ? '更新' : '保存'}</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setEditingId(null); }}><X className="w-4 h-4 mr-1" />取消</Button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-4 text-gray-400 text-sm">加载中...</div> : contacts.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">暂无联系人</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {contacts.map(c => (
            <div key={c.id} className={`rounded-xl border p-4 hover:shadow-md transition-shadow ${c.id === keyId ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200 bg-white'}`}>
              {/* 顶部：关键联系人选中和姓名 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input type="radio" name={`kc-${customerId}`} checked={c.id === keyId} onChange={() => setKeyContact(c)} className="accent-yellow-500 w-4 h-4" title="设为关键联系人" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{c.name}</h4>
                    {c.position && <p className="text-xs text-gray-500">{c.position}</p>}
                  </div>
                </div>
                {c.id === keyId && <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full whitespace-nowrap">⭐关键</span>}
              </div>
              
              {/* 联系方式 */}
              <div className="space-y-1.5 mb-3">
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\s/g,'')}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <Phone className="w-3 h-3" /> {c.phone}
                  </a>
                )}
                {c.whatsapp && (
                  <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-600 hover:underline">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
                    WhatsApp
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-orange-600 hover:underline">
                    <Mail className="w-3 h-3" /> {c.email}
                  </a>
                )}
              </div>

              {/* 备注 */}
              {c.remarks && <p className="text-xs text-gray-400 mb-3 border-l-2 border-gray-200 pl-2">{c.remarks}</p>}

              {/* 操作 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('zh-CN') : ''}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                  <button onClick={() => deleteContact(c.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
