'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, Phone, Mail, Globe, Users, FileText } from 'lucide-react';
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
  status: string;
  contacts: Contact[];
  keyContact?: Contact | null;
  _count: {
    orders: number;
  };
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  remarks?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, [search, status, page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return;

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        fetchCustomers();
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/customers/import')}
            variant="secondary"
            icon={<FileText size={20} />}
          >
            批量导入
          </Button>
          <Button
            onClick={() => router.push('/customers/new')}
            icon={<Plus size={20} />}
          >
            新增客户
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索公司名称、邮箱、行业..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
            <option value="lead">潜在</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">公司名称</th>
                  <th className="text-left p-3">国家</th>
                  <th className="text-left p-3">行业</th>
                  <th className="text-left p-3">关键联系人</th>
                  <th className="text-left p-3">职位</th>
                  <th className="text-left p-3">WhatsApp</th>
                  <th className="text-left p-3">电话</th>
                  <th className="text-left p-3">邮箱</th>
                  <th className="text-left p-3">联系人</th>
                  <th className="text-left p-3">订单数</th>
                  <th className="text-left p-3">状态</th>
                  <th className="text-left p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-gray-500">
                      暂无客户数据
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <div>
                            <div className="font-medium">{customer.companyName}</div>
                            {customer.enterpriseScale && (
                              <div className="text-xs text-gray-500">{customer.enterpriseScale}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{customer.country || '-'}</td>
                      <td className="p-3">{customer.industry || '-'}</td>
                      <td className="p-3">
                        <span className={customer.keyContact?.name ? 'font-medium text-blue-700' : 'text-gray-400'}>
                          {customer.keyContact?.name || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{customer.keyContact?.position || '-'}</td>
                      <td className="p-3">
                        {customer.keyContact?.whatsapp ? (
                          <a href={`https://wa.me/${customer.keyContact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                            {customer.keyContact.whatsapp}
                          </a>
                        ) : (customer.contacts[0]?.whatsapp ? (
                          <a href={`https://wa.me/${customer.contacts[0].whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                            {customer.contacts[0].whatsapp}
                          </a>
                        ) : '-')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={14} className="text-gray-400" />
                          {customer.keyContact?.phone || customer.phone || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail size={14} className="text-gray-400" />
                          {customer.keyContact?.email || customer.email || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-gray-400" />
                          {customer.contacts.length} 人
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {customer._count.orders}
                        </span>
                      </td>
                      <td className="p-3">{getStatusBadge(customer.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/customers/${customer.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => router.push(`/customers/${customer.id}/edit`)}
                            className="text-green-600 hover:text-green-800"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              第 {page} 页，共 {totalPages} 页
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
