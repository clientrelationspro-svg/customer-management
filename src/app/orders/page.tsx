'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  ShoppingCart,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/utils';

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  orderDate: string;
  customer: {
    id: string;
    name: string;
  };
  _count: {
    items: number;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      
      setOrders(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchOrders();
        setIsDeleteModalOpen(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const getPaymentStatus = (order: Order) => {
    if (order.paidAmount === 0) return { label: '未付款', color: 'bg-red-100 text-red-800' };
    if (order.paidAmount >= order.totalAmount) return { label: '已付款', color: 'bg-green-100 text-green-800' };
    return { label: '部分付款', color: 'bg-yellow-100 text-yellow-800' };
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">订单管理</h1>
        <Button onClick={() => router.push('/orders/new')} className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          创建订单
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索订单号..."
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
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="shipped">已发货</option>
            <option value="delivered">已送达</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </Card>

      {/* 订单列表 */}
      <Card>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无订单数据</div>
        ) : (
          <>
            {/* 移动端卡片视图 */}
            <div className="block md:hidden space-y-3">
              {orders.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                const paymentStatus = getPaymentStatus(order);
                return (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-600 text-sm truncate">{order.orderNo}</p>
                        <button
                          onClick={() => router.push(`/customers/${order.customer.id}`)}
                          className="text-xs text-gray-900 hover:text-blue-600 mt-0.5 truncate block"
                        >
                          {order.customer.name}
                        </button>
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
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
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</span>
                        <span>{order._count.items} 件商品</span>
                      </div>
                      {order.paidAmount > 0 && (
                        <p className="text-gray-500">已付: {formatCurrency(order.paidAmount)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${paymentStatus.color}`}>
                          {paymentStatus.label}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">{formatDate(order.orderDate)}</p>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">订单号</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">客户</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">金额</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">付款状态</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">订单状态</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">日期</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusBadge = getStatusBadge(order.status);
                    const paymentStatus = getPaymentStatus(order);
                    return (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <p className="font-medium text-blue-600">{order.orderNo}</p>
                          <p className="text-sm text-gray-600">{order._count.items} 件商品</p>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => router.push(`/customers/${order.customer.id}`)}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {order.customer.name}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          {order.paidAmount > 0 && (
                            <p className="text-sm text-gray-600">
                              已付: {formatCurrency(order.paidAmount)}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentStatus.color}`}>
                            {paymentStatus.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="查看"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
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
          setSelectedOrder(null);
        }}
        onConfirm={handleDelete}
        title="删除订单"
        message={`确定要删除订单 "${selectedOrder?.orderNo}" 吗？此操作将恢复库存。`}
        danger
      />
    </div>
  );
}
