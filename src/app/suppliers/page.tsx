'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Truck,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { getStatusBadge } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  contactPerson: string | null;
  status: string;
  _count: {
    products: number;
  };
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/suppliers?${params}`);
      const data = await res.json();
      
      setSuppliers(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchSuppliers();
        setIsDeleteModalOpen(false);
        setSelectedSupplier(null);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">供应商管理</h1>
        <Button onClick={() => router.push('/suppliers/new')} className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          新增供应商
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索供应商名称、邮箱、公司..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-nowrap"
          >
            <option value="">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
          </select>
        </div>
      </Card>

      {/* 供应商列表 */}
      <Card>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无供应商数据</div>
        ) : (
          <>
            {/* 移动端卡片视图 */}
            <div className="block md:hidden space-y-3">
              {suppliers.map((supplier) => {
                const statusBadge = getStatusBadge(supplier.status);
                return (
                  <div key={supplier.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{supplier.name}</h3>
                        {supplier.company && (
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{supplier.company}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <button
                          onClick={() => router.push(`/suppliers/${supplier.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      {supplier.contactPerson && (
                        <p>联系人: {supplier.contactPerson}</p>
                      )}
                      {supplier.email && (
                        <p className="truncate">📧 {supplier.email}</p>
                      )}
                      {supplier.phone && (
                        <p>📞 {supplier.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Package className="w-3 h-3 text-gray-400" />
                          {supplier._count.products} 个产品
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 桌面端表格视图 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">供应商信息</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">联系方式</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">联系人</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">产品数</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const statusBadge = getStatusBadge(supplier.status);
                    return (
                      <tr key={supplier.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Truck className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{supplier.name}</p>
                              {supplier.company && (
                                <p className="text-sm text-gray-600">{supplier.company}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {supplier.email && (
                              <p className="text-sm text-gray-600">{supplier.email}</p>
                            )}
                            {supplier.phone && (
                              <p className="text-sm text-gray-600">{supplier.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {supplier.contactPerson || '-'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {supplier._count.products}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/suppliers/${supplier.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="查看"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="flex items-center px-4">
              第 {page} 页，共 {totalPages} 页
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              下一页
            </Button>
          </div>
        )}
      </Card>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSupplier(null);
        }}
        onConfirm={handleDelete}
        title="删除供应商"
        message={`确定要删除供应商 "${selectedSupplier?.name}" 吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}
