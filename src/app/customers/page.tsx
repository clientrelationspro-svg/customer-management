'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, Phone, Mail, Globe, Users, FileText, Edit3, Trash2, Eye, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  companyName: string;
  enterpriseScale?: string;
  country?: string;
  industry?: string;
  phone?: string;
  email?: string;
  website?: string;
  level?: string;
  notes?: string;
  status: string;
  contacts: Contact[];
  keyContact?: Contact | null;
  _count: { orders: number };
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchCustomers(); }, [search, status, level, page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      if (level) params.append('level', level);
      params.append('page', page.toString());
      params.append('limit', '10');

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if ((await res.json()).success) fetchCustomers();
    } catch (e) { console.error(e); }
  };

  const levelColors: Record<string, string> = {
    A: 'bg-red-100 text-red-700 border-red-200',
    B: 'bg-orange-100 text-orange-700 border-orange-200',
    C: 'bg-blue-100 text-blue-700 border-blue-200',
    D: 'bg-green-100 text-green-700 border-green-200',
    E: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { active: '活跃', inactive: '停用', lead: '潜在' };
    const c: Record<string, string> = { active: 'bg-green-50 text-green-700', inactive: 'bg-gray-100 text-gray-500', lead: 'bg-blue-50 text-blue-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[s] || c.inactive}`}>{m[s] || s}</span>;
  };

  const getContact = (c: Customer) => c.keyContact || c.contacts[0] || null;
  const firstContact = (c: Customer) => c.contacts[0] || null;

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    if (mins < 1440) return `${Math.floor(mins / 60)}小时前`;
    if (mins < 43200) return `${Math.floor(mins / 1440)}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div>
      {/* 头部 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">客户管理</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={() => router.push('/customers/import')} variant="secondary" className="flex-1 md:flex-none">
            <FileText className="w-5 h-5 mr-1" /> 批量导入
          </Button>
          <Button onClick={() => router.push('/customers/new')} className="flex-1 md:flex-none">
            <Plus className="w-5 h-5 mr-1" /> 新增客户
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="搜索公司名称、邮箱、行业..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="inactive">停用</option>
          <option value="lead">潜在</option>
        </select>
        <select className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm" value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">全部等级</option>
          <option value="A">A 级</option>
          <option value="B">B 级</option>
          <option value="C">C 级</option>
          <option value="D">D 级</option>
          <option value="E">E 级</option>
        </select>
      </div>

      {/* 卡片网格 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">暂无客户数据</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(customer => {
            const contact = getContact(customer);
            const alt = firstContact(customer);

            return (
              <div key={customer.id}
                className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => router.push(`/customers/${customer.id}`)}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 px-4 py-3">
                  <div className="flex items-center gap-2 sm:hidden">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${levelColors[customer.level || 'C']}`}>{customer.level || 'C'}</span>
                    {statusBadge(customer.status)}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex-shrink-0 hidden sm:block ${levelColors[customer.level || 'C']}`}>{customer.level || 'C'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">{customer.companyName}</h3>
                      <span className="hidden sm:inline">{statusBadge(customer.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                      {customer.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{customer.country}</span>}
                      {customer.industry && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 flex-shrink-0" />{customer.industry}</span>}
                      {contact && <span className="text-blue-600 font-medium"><Users className="w-3 h-3 inline mr-1" />{contact.name}{contact.position ? `·${contact.position}` : ''}</span>}
                      {!contact && alt && <span><Users className="w-3 h-3 inline mr-1" />{alt.name}</span>}
                      {customer.contacts.length > 0 && <span className="text-gray-400">{customer.contacts.length}人</span>}
                      <span className="text-gray-400"><Clock className="w-3 h-3 inline mr-0.5" />{formatTime(customer.updatedAt)}</span>
                    </div>
                    {customer.notes && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-3 leading-relaxed">{customer.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-start" onClick={e => e.stopPropagation()}>
                    {(contact?.whatsapp || alt?.whatsapp) && (
                      <a href={`https://wa.me/${(contact?.whatsapp || alt?.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="WhatsApp">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
                      </a>
                    )}
                    {(contact?.email || customer.email) && (
                      <a href={`mailto:${contact?.email || customer.email}`} className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100" title="邮件"><Mail className="w-3.5 h-3.5" /></a>
                    )}
                    {(contact?.phone || customer.phone) && (
                      <a href={`tel:${(contact?.phone || customer.phone || '').replace(/\s/g, '')}`} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="电话"><Phone className="w-3.5 h-3.5" /></a>
                    )}
                    <button onClick={() => router.push(`/customers/${customer.id}/edit`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="编辑"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page === 1}>上一页</Button>
          <span className="flex items-center px-4 text-sm text-gray-500">第 {page} 页，共 {totalPages} 页</span>
          <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>下一页</Button>
        </div>
      )}
    </div>
  );
}
