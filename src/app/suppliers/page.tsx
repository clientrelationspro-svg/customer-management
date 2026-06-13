'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Trash2, Star, Edit3, Eye, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  mainProducts?: string;
  cooperationStatus: string;
  riskLevel?: string;
  riskTypes?: string;
  riskDescription?: string;
  orderAmount?: number;
  isStarred: boolean;
  notes?: string;
  updatedAt: string;
  _count?: { riskEvents: number };
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [coopFilter, setCoopFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: '20', sortBy, sortOrder });
      if (coopFilter) params.set('cooperationStatus', coopFilter);
      if (riskFilter) params.set('riskLevel', riskFilter);
      if (countryFilter) params.set('country', countryFilter);
      if (starredOnly) params.set('starred', 'true');

      const res = await fetch(`/api/suppliers?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuppliers(data.data);
          setTotal(data.total);
        }
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, coopFilter, riskFilter, countryFilter, sortBy, sortOrder, starredOnly]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selected.size === suppliers.length) setSelected(new Set());
    else setSelected(new Set(suppliers.map(s => s.id)));
  };

  const toggleStar = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !current }),
      });
      fetchSuppliers();
    } catch (error) { console.error(error); }
  };

  const batchDelete = async () => {
    if (selected.size === 0) return alert('请选择要删除的供应商');
    if (!confirm(`确定删除 ${selected.size} 个供应商吗？此操作不可撤销。`)) return;
    setDeleting(true);
    let count = 0;
    const ids = Array.from(selected);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (res.ok) count++;
      } catch {}
    }
    setDeleting(false);
    setSelected(new Set());
    setPage(1);
    fetchSuppliers();
    alert(`成功删除 ${count} 个供应商`);
  };

  const handleExport = () => {
    const params = new URLSearchParams({ search });
    if (coopFilter) params.set('cooperationStatus', coopFilter);
    if (riskFilter) params.set('riskLevel', riskFilter);
    if (countryFilter) params.set('country', countryFilter);
    if (selected.size > 0) params.set('ids', Array.from(selected).join(','));
    window.open(`/api/suppliers/export?${params}`, '_blank');
  };

  const statusLabel: Record<string, string> = { potential: '潜在', active: '合作中', suspended: '暂停', terminated: '终止' };
  const statusColor: Record<string, string> = { potential: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700', suspended: 'bg-yellow-100 text-yellow-700', terminated: 'bg-red-100 text-red-700' };
  const riskLabel: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  const riskColor: Record<string, string> = { high: 'bg-red-100 text-red-700 font-medium', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-600', };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleExport} title="导出Excel"><Download className="w-4 h-4 mr-1" />导出</Button>
          {selected.size > 0 && (
            <Button variant="danger" onClick={batchDelete} loading={deleting}>
              <Trash2 className="w-4 h-4 mr-1" />删除({selected.size})
            </Button>
          )}
          <Button onClick={() => router.push('/suppliers/new')}><Plus className="w-4 h-4 mr-1" />新增供应商</Button>
        </div>
      </div>

      {/* 搜索与筛选 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索公司名、国家、产品..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex-shrink-0">
            <Filter className="w-4 h-4 mr-1" />{showFilters ? '收起' : '筛选'}{showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="updatedAt">更新时间</option>
            <option value="riskLevel">风险等级</option>
            <option value="orderAmount">订单金额</option>
          </select>
          <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            {sortOrder === 'desc' ? '↓ 降序' : '↑ 升序'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-3 items-center">
            <select value={coopFilter} onChange={e => { setCoopFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">全部状态</option>
              <option value="potential">潜在</option>
              <option value="active">合作中</option>
              <option value="suspended">暂停</option>
              <option value="terminated">终止</option>
            </select>
            <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">全部风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
            <input type="text" value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setPage(1); }} placeholder="国家筛选..." className="px-3 py-1.5 border border-gray-300 rounded text-sm w-32" />
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={starredOnly} onChange={e => { setStarredOnly(e.target.checked); setPage(1); }} className="rounded" />仅星标
            </label>
            {(coopFilter || riskFilter || countryFilter || starredOnly) && (
              <button onClick={() => { setCoopFilter(''); setRiskFilter(''); setCountryFilter(''); setStarredOnly(false); setPage(1); }} className="text-xs text-blue-600 hover:underline"><X className="w-3 h-3 inline mr-0.5" />清除筛选</button>
            )}
          </div>
        )}
      </Card>

      {/* 表格 */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无供应商，点击"新增供应商"添加</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-3 px-2 w-8">
                      <input type="checkbox" checked={selected.size === suppliers.length && suppliers.length > 0} onChange={toggleSelectAll} className="rounded" />
                    </th>
                    <th className="py-3 px-3 font-medium">公司名称</th>
                    <th className="py-3 px-3 font-medium hidden md:table-cell">国家</th>
                    <th className="py-3 px-3 font-medium hidden lg:table-cell">产品</th>
                    <th className="py-3 px-3 font-medium">风险等级</th>
                    <th className="py-3 px-3 font-medium hidden md:table-cell">合作状态</th>
                    <th className="py-3 px-3 font-medium hidden lg:table-cell">更新时间</th>
                    <th className="py-3 px-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleStar(s.id, s.isStarred)} className="flex-shrink-0">
                            <Star className={`w-4 h-4 ${s.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} />
                          </button>
                          <span className="font-medium text-gray-900 truncate max-w-[160px]">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{s.country || '-'}</td>
                      <td className="py-3 px-3 text-gray-600 hidden lg:table-cell truncate max-w-[120px]">{s.mainProducts || '-'}</td>
                      <td className="py-3 px-3">
                        {s.riskLevel ? <span className={`px-2 py-0.5 rounded-full text-xs ${riskColor[s.riskLevel] || ''}`}>{riskLabel[s.riskLevel] || s.riskLevel}</span> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[s.cooperationStatus] || 'bg-gray-100'}`}>{statusLabel[s.cooperationStatus] || s.cooperationStatus}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 hidden lg:table-cell text-xs">{new Date(s.updatedAt).toLocaleDateString('zh-CN')}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => router.push(`/suppliers/${s.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="查看"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => router.push(`/suppliers/${s.id}/edit`)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="编辑"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={async () => { if (confirm('确定删除吗？')) { await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' }); fetchSuppliers(); } }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {total > 20 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
                <span className="text-sm text-gray-500">共 {total} 条</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                  <span className="px-3 py-1 text-sm">{page} / {Math.ceil(total / 20)}</span>
                  <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
