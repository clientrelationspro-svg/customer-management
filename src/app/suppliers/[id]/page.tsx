'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit3, Trash2, Star, Plus, Save, X, Phone, Mail, MessageCircle, Globe, MapPin, Calendar, Building2, Package, AlertTriangle, Send, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SupplierContact {
  id: string; supplierId: string; name: string; position?: string; phone?: string;
  whatsapp?: string; email?: string; wechat?: string; decisionWeight?: string;
  communicationPreference?: string; timezone?: string; remarks?: string;
}
interface Communication {
  id: string; supplierId: string; contactId?: string; method: string; content: string;
  createdAt: string; contact?: { id: string; name: string };
}
interface RiskEvent {
  id: string; supplierId: string; riskType: string; description: string;
  severity: string; occurredAt: string; resolvedAt?: string;
}
interface Supplier {
  id: string; name: string; email?: string; phone?: string; website?: string;
  address?: string; country?: string; mainProducts?: string;
  cooperationStatus: string; riskLevel?: string; riskTypes?: string;
  riskDescription?: string; foundedDate?: string; orderAmount?: number;
  isStarred: boolean; notes?: string; createdAt: string; updatedAt: string;
  contacts: SupplierContact[]; communications: Communication[];
  riskEvents: RiskEvent[]; products: any[]; files: any[];
}

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 联系人表单
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>({});
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // 沟通记录表单
  const [showCommForm, setShowCommForm] = useState(false);
  const [commContent, setCommContent] = useState('');
  const [commMethod, setCommMethod] = useState('meeting');
  const [commContactId, setCommContactId] = useState('');

  // 风险事件表单
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskForm, setRiskForm] = useState({ riskType: '其他', description: '', severity: 'medium' });

  // 可编辑的基本信息
  const [editData, setEditData] = useState<any>({});

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSupplier(data.data);
          setEditData(data.data);
        }
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchSupplier(); }, [id]);

  // 保存基本信息
  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) { setEditing(false); fetchSupplier(); }
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  // 联系人操作
  const saveContact = async () => {
    if (!contactForm.name?.trim()) return alert('请填写姓名');
    try {
      if (editingContactId) {
        await fetch(`/api/suppliers/${id}/contacts/manage?contactId=${editingContactId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm),
        });
      } else {
        await fetch(`/api/suppliers/${id}/contacts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm),
        });
      }
      setShowContactForm(false); setEditingContactId(null); setContactForm({});
      fetchSupplier();
    } catch {}
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm('确定删除此联系人？')) return;
    await fetch(`/api/suppliers/${id}/contacts/manage?contactId=${contactId}`, { method: 'DELETE' });
    fetchSupplier();
  };

  // 沟通记录操作
  const saveCommunication = async () => {
    if (!commContent.trim()) return alert('请填写沟通内容');
    await fetch(`/api/suppliers/${id}/communications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commContent, method: commMethod, contactId: commContactId || null }),
    });
    setShowCommForm(false); setCommContent(''); setCommMethod('meeting'); setCommContactId('');
    fetchSupplier();
  };

  // 风险事件操作
  const saveRiskEvent = async () => {
    if (!riskForm.description.trim()) return alert('请填写风险描述');
    await fetch(`/api/suppliers/${id}/risk-events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(riskForm),
    });
    setShowRiskForm(false); setRiskForm({ riskType: '其他', description: '', severity: 'medium' });
    fetchSupplier();
  };

  const toggleStar = async () => {
    if (!supplier) return;
    await fetch(`/api/suppliers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !supplier.isStarred }),
    });
    fetchSupplier();
  };

  const statusLabel: Record<string, string> = { potential: '潜在', active: '合作中', suspended: '暂停', terminated: '终止' };
  const statusColor: Record<string, string> = { potential: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700', suspended: 'bg-yellow-100 text-yellow-700', terminated: 'bg-red-100 text-red-700' };
  const riskLabel: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  const riskColor: Record<string, string> = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' };
  const methodIcon: Record<string, any> = { phone: Phone, email: Mail, whatsapp: MessageCircle, wechat: MessageCircle, meeting: Calendar, other: Send };

  if (loading) return <div className="text-center py-8">加载中...</div>;
  if (!supplier) return <div className="text-center py-8 text-red-500">供应商不存在</div>;

  const tabs = [
    { key: 'info', label: '基本信息' },
    { key: 'contacts', label: `联系人 (${supplier.contacts?.length || 0})` },
    { key: 'communications', label: `沟通记录 (${supplier.communications?.length || 0})` },
    { key: 'risks', label: `风险事件 (${supplier.riskEvents?.length || 0})` },
    { key: 'products', label: `关联产品 (${supplier.products?.length || 0})` },
    { key: 'files', label: `文件 (${supplier.files?.length || 0})` },
    { key: 'notes', label: '备注' },
  ];

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/suppliers')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={toggleStar}><Star className={`w-6 h-6 ${supplier.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} /></button>
        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[supplier.cooperationStatus]}`}>{statusLabel[supplier.cooperationStatus]}</span>
        {supplier.riskLevel && <span className={`text-sm font-medium ${riskColor[supplier.riskLevel]}`}>⚠ {riskLabel[supplier.riskLevel]}</span>}
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: 基本信息 */}
      {activeTab === 'info' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">基本信息</h2>
            {!editing ? (
              <Button variant="secondary" size="sm" onClick={() => { setEditing(true); setEditData({ ...supplier }); }}><Edit3 className="w-4 h-4 mr-1" />编辑</Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveInfo} loading={saving}><Save className="w-4 h-4 mr-1" />保存</Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />取消</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {editing ? (
              <>
                <Field label="公司名称" required><input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className="form-input" /></Field>
                <Field label="国家"><input type="text" value={editData.country || ''} onChange={e => setEditData({ ...editData, country: e.target.value })} className="form-input" /></Field>
                <Field label="主要产品"><input type="text" value={editData.mainProducts || ''} onChange={e => setEditData({ ...editData, mainProducts: e.target.value })} className="form-input" /></Field>
                <Field label="合作状态">
                  <select value={editData.cooperationStatus || 'potential'} onChange={e => setEditData({ ...editData, cooperationStatus: e.target.value })} className="form-input">
                    <option value="potential">潜在</option><option value="active">合作中</option><option value="suspended">暂停</option><option value="terminated">终止</option>
                  </select>
                </Field>
                <Field label="风险等级">
                  <select value={editData.riskLevel || ''} onChange={e => setEditData({ ...editData, riskLevel: e.target.value })} className="form-input">
                    <option value="">未设置</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option>
                  </select>
                </Field>
                <Field label="风险类型"><input type="text" value={editData.riskTypes || ''} onChange={e => setEditData({ ...editData, riskTypes: e.target.value })} placeholder="制裁,诉讼,经营异常,合规,其他" className="form-input" /></Field>
                <Field label="电话"><input type="text" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="form-input" /></Field>
                <Field label="邮箱"><input type="email" value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} className="form-input" /></Field>
                <Field label="网站"><input type="text" value={editData.website || ''} onChange={e => setEditData({ ...editData, website: e.target.value })} className="form-input" /></Field>
                <Field label="地址"><input type="text" value={editData.address || ''} onChange={e => setEditData({ ...editData, address: e.target.value })} className="form-input" /></Field>
                <Field label="成立日期"><input type="date" value={editData.foundedDate ? new Date(editData.foundedDate).toISOString().split('T')[0] : ''} onChange={e => setEditData({ ...editData, foundedDate: e.target.value })} className="form-input" /></Field>
                <Field label="订单金额"><input type="number" value={editData.orderAmount || ''} onChange={e => setEditData({ ...editData, orderAmount: e.target.value })} className="form-input" /></Field>
                <Field label="风险描述" span>
                  <textarea value={editData.riskDescription || ''} onChange={e => setEditData({ ...editData, riskDescription: e.target.value })} rows={2} className="form-input" />
                </Field>
              </>
            ) : (
              <>
                <InfoRow icon={Building2} label="公司名称" value={supplier.name} />
                <InfoRow icon={Globe} label="国家" value={supplier.country} />
                <InfoRow icon={Package} label="主要产品" value={supplier.mainProducts} />
                <InfoRow label="合作状态" value={<span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[supplier.cooperationStatus]}`}>{statusLabel[supplier.cooperationStatus]}</span>} />
                <InfoRow icon={AlertTriangle} label="风险等级" value={supplier.riskLevel ? <span className={riskColor[supplier.riskLevel]}>{riskLabel[supplier.riskLevel]}</span> : '-'} />
                <InfoRow label="风险类型" value={supplier.riskTypes} />
                <InfoRow icon={Phone} label="电话" value={supplier.phone} />
                <InfoRow icon={Mail} label="邮箱" value={supplier.email} />
                <InfoRow icon={Globe} label="网站" value={supplier.website ? <a href={supplier.website} target="_blank" className="text-blue-600 hover:underline">{supplier.website}</a> : null} />
                <InfoRow icon={MapPin} label="地址" value={supplier.address} />
                <InfoRow icon={Calendar} label="成立日期" value={supplier.foundedDate ? new Date(supplier.foundedDate).toLocaleDateString('zh-CN') : undefined} />
                <InfoRow label="订单金额" value={supplier.orderAmount != null ? `¥${supplier.orderAmount.toLocaleString()}` : undefined} />
                {supplier.riskDescription && <InfoRow label="风险描述" value={supplier.riskDescription} span />}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Tab 2: 联系人 */}
      {activeTab === 'contacts' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">联系人</h2>
            <Button size="sm" onClick={() => { setShowContactForm(true); setEditingContactId(null); setContactForm({}); }}><Plus className="w-4 h-4 mr-1" />新增联系人</Button>
          </div>

          {showContactForm && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-3">{editingContactId ? '编辑联系人' : '新增联系人'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="text" placeholder="姓名 *" value={contactForm.name || ''} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} className="form-input" />
                <input type="text" placeholder="职位" value={contactForm.position || ''} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} className="form-input" />
                <input type="text" placeholder="电话" value={contactForm.phone || ''} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className="form-input" />
                <input type="text" placeholder="WhatsApp" value={contactForm.whatsapp || ''} onChange={e => setContactForm({ ...contactForm, whatsapp: e.target.value })} className="form-input" />
                <input type="email" placeholder="邮箱" value={contactForm.email || ''} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="form-input" />
                <input type="text" placeholder="微信" value={contactForm.wechat || ''} onChange={e => setContactForm({ ...contactForm, wechat: e.target.value })} className="form-input" />
                <select value={contactForm.decisionWeight || ''} onChange={e => setContactForm({ ...contactForm, decisionWeight: e.target.value })} className="form-input">
                  <option value="">决策权重</option><option value="关键">关键</option><option value="重要">重要</option><option value="一般">一般</option>
                </select>
                <input type="text" placeholder="沟通偏好" value={contactForm.communicationPreference || ''} onChange={e => setContactForm({ ...contactForm, communicationPreference: e.target.value })} className="form-input" />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={saveContact}><Save className="w-3 h-3 mr-1" />保存</Button>
                <Button variant="secondary" size="sm" onClick={() => { setShowContactForm(false); setEditingContactId(null); }}><X className="w-3 h-3 mr-1" />取消</Button>
              </div>
            </div>
          )}

          {supplier.contacts?.length === 0 ? <p className="text-gray-500 text-sm py-4">暂无联系人</p> : (
            <div className="space-y-3">
              {supplier.contacts?.map(c => (
                <div key={c.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{c.name}</span>
                      {c.position && <span className="text-gray-500 ml-2">- {c.position}</span>}
                      {c.decisionWeight && <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${c.decisionWeight === '关键' ? 'bg-red-100 text-red-700' : c.decisionWeight === '重要' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{c.decisionWeight}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingContactId(c.id); setContactForm(c); setShowContactForm(true); }} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteContact(c.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.whatsapp && <span>💬 {c.whatsapp}</span>}
                    {c.email && <span>✉ {c.email}</span>}
                    {c.wechat && <span>🟢 微信: {c.wechat}</span>}
                    {c.communicationPreference && <span>🎯 偏好: {c.communicationPreference}</span>}
                  </div>
                  {c.remarks && <p className="mt-1 text-xs text-gray-400">{c.remarks}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: 沟通记录 */}
      {activeTab === 'communications' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">沟通记录</h2>
            <Button size="sm" onClick={() => setShowCommForm(true)}><Plus className="w-4 h-4 mr-1" />新增记录</Button>
          </div>

          {showCommForm && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2 mb-3">
                <select value={commMethod} onChange={e => setCommMethod(e.target.value)} className="form-input w-32">
                  <option value="meeting">会议</option><option value="phone">电话</option><option value="email">邮件</option><option value="whatsapp">WhatsApp</option><option value="wechat">微信</option><option value="other">其他</option>
                </select>
                {supplier.contacts?.length > 0 && (
                  <select value={commContactId} onChange={e => setCommContactId(e.target.value)} className="form-input flex-1">
                    <option value="">不关联联系人</option>
                    {supplier.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <textarea value={commContent} onChange={e => setCommContent(e.target.value)} rows={3} placeholder="沟通内容..." className="form-input w-full mb-2" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveCommunication}><Save className="w-3 h-3 mr-1" />保存</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCommForm(false)}><X className="w-3 h-3 mr-1" />取消</Button>
              </div>
            </div>
          )}

          {supplier.communications?.length === 0 ? <p className="text-gray-500 text-sm py-4">暂无沟通记录</p> : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {supplier.communications?.map(c => {
                const Icon = methodIcon[c.method] || Send;
                return (
                  <div key={c.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">{c.method}</span>
                      {c.contact && <span className="text-xs text-blue-600">- {c.contact.name}</span>}
                      <span className="text-xs text-gray-400 ml-auto">{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: 风险事件 */}
      {activeTab === 'risks' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">风险事件</h2>
            <Button size="sm" onClick={() => setShowRiskForm(true)}><Plus className="w-4 h-4 mr-1" />新增事件</Button>
          </div>

          {showRiskForm && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <select value={riskForm.riskType} onChange={e => setRiskForm({ ...riskForm, riskType: e.target.value })} className="form-input">
                  <option value="制裁">制裁</option><option value="诉讼">诉讼</option><option value="经营异常">经营异常</option><option value="合规">合规</option><option value="其他">其他</option>
                </select>
                <select value={riskForm.severity} onChange={e => setRiskForm({ ...riskForm, severity: e.target.value })} className="form-input">
                  <option value="high">高严重</option><option value="medium">中严重</option><option value="low">低严重</option>
                </select>
              </div>
              <textarea value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })} rows={2} placeholder="风险描述..." className="form-input w-full mb-2" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveRiskEvent}><Save className="w-3 h-3 mr-1" />保存</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowRiskForm(false)}><X className="w-3 h-3 mr-1" />取消</Button>
              </div>
            </div>
          )}

          {supplier.riskEvents?.length === 0 ? <p className="text-gray-500 text-sm py-4">暂无风险事件</p> : (
            <div className="space-y-2">
              {supplier.riskEvents?.map(e => (
                <div key={e.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.severity === 'high' ? 'bg-red-100 text-red-700' : e.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'}`}>
                      {e.severity === 'high' ? '严重' : e.severity === 'medium' ? '中等' : '轻微'}
                    </span>
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{e.riskType}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(e.occurredAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{e.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: 关联产品 */}
      {activeTab === 'products' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">关联产品</h2>
          {supplier.products?.length === 0 ? <p className="text-gray-500 text-sm">暂无关联产品</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-600"><th className="py-2 px-3">名称</th><th className="py-2 px-3">SKU</th><th className="py-2 px-3">价格</th><th className="py-2 px-3">库存</th></tr></thead>
                <tbody>
                  {supplier.products?.map(p => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{p.name}</td><td className="py-2 px-3 text-gray-500">{p.sku}</td>
                      <td className="py-2 px-3">¥{Number(p.price).toFixed(2)}</td><td className="py-2 px-3">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 6: 文件 */}
      {activeTab === 'files' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">文件</h2>
          {supplier.files?.length === 0 ? <p className="text-gray-500 text-sm">暂无文件</p> : (
            <div className="space-y-2">
              {supplier.files?.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{f.originalName || f.filename}</span>
                  <span className="text-xs text-gray-400">{f.mimeType} · {(f.fileSize / 1024).toFixed(1)}KB</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 7: 备注 */}
      {activeTab === 'notes' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">备注</h2>
          {editing ? (
            <div>
              <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={6} className="form-input w-full" placeholder="添加备注..." />
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleSaveInfo} loading={saving}><Save className="w-3 h-3 mr-1" />保存</Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}><X className="w-3 h-3 mr-1" />取消</Button>
              </div>
            </div>
          ) : (
            <div>
              {supplier.notes ? <p className="text-gray-700 whitespace-pre-wrap">{supplier.notes}</p> : <p className="text-gray-400 text-sm">暂无备注</p>}
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setEditing(true); setEditData({ ...supplier }); }}><Edit3 className="w-3 h-3 mr-1" />编辑</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// 辅助组件
function Field({ label, children, required, span }: { label: string; children: React.ReactNode; required?: boolean; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2 lg:col-span-3' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, span }: { icon?: any; label: string; value?: React.ReactNode; span?: boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={span ? 'md:col-span-2 lg:col-span-3' : ''}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5 text-sm text-gray-900">
        {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        {value}
      </div>
    </div>
  );
}
