'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw, Search, Clock, CheckCircle, Send, Archive, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Inquiry {
  id: string; fromEmail: string; fromName?: string; subject: string;
  status: string; language?: string; aiSummary?: string;
  productInterested?: string; createdAt: string;
  customer?: { id: string; companyName: string };
}

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/inquiries?${params}`);
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (data.success) { fetchInquiries(); alert(data.message); }
      else alert(data.error || '同步失败');
    } catch { alert('同步失败'); }
    finally { setSyncing(false); }
  };

  const statusLabel: Record<string, string> = { new: '新询价', processing: 'AI处理中', reviewed: '待回复', replied: '已回复', archived: '已归档' };
  const statusColor: Record<string, string> = { new: 'bg-blue-100 text-blue-700', processing: 'bg-purple-100 text-purple-700', reviewed: 'bg-yellow-100 text-yellow-700', replied: 'bg-green-100 text-green-700', archived: 'bg-gray-100 text-gray-500' };
  const langFlag: Record<string, string> = { zh: '🇨🇳', en: '🇺🇸', es: '🇪🇸' };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">询价管理</h1>
        <Button onClick={handleSync} loading={syncing}>
          <RefreshCw className="w-4 h-4 mr-1" />{syncing ? '同步中...' : '拉取新邮件'}
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="搜索邮件主题、发件人..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部状态</option>
            <option value="new">新询价</option>
            <option value="processing">AI处理中</option>
            <option value="reviewed">待回复</option>
            <option value="replied">已回复</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </Card>

      {loading ? <div className="text-center py-8 text-gray-500">加载中...</div> :
      inquiries.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无询价</p>
            <p className="text-sm mt-1">点击"拉取新邮件"同步邮箱中的询价</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map(i => (
            <div key={i.id} onClick={() => router.push(`/inquiries/${i.id}`)}
              className="bg-white rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer p-4 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-900 truncate">{i.subject}</span>
                    {i.language && <span className="text-sm">{langFlag[i.language] || ''}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[i.status]}`}>
                      {statusLabel[i.status] || i.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>{i.fromName || i.fromEmail}</span>
                    <span>{new Date(i.createdAt).toLocaleString('zh-CN')}</span>
                    {i.productInterested && <span className="text-blue-600">📦 {i.productInterested}</span>}
                    {i.customer && <span className="text-green-600">🏢 {i.customer.companyName}</span>}
                  </div>
                  {i.aiSummary && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{i.aiSummary}</p>}
                </div>
                <Eye className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
