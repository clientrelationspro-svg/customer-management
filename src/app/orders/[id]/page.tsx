'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Trash2, 
  ShoppingCart,
  Package,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/utils';
import Link from 'next/link';

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  orderDate: string;
  deliveryDate: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else if (res.status === 404) {
        router.push('/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/orders');
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

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">订单不存在</div>;
  }

  const statusBadge = getStatusBadge(order.status);
  const paymentStatus = getPaymentStatus(order);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.orderNo}</h1>
            <p className="text-gray-600 mt-1">订单详情</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            删除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 订单信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">订单信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">订单号</p>
                <p className="font-medium text-gray-900">{order.orderNo}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">订单状态</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">付款状态</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentStatus.color}`}>
                  {paymentStatus.label}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> 订单日期
                </p>
                <p className="font-medium text-gray-900">{formatDate(order.orderDate)}</p>
              </div>

              {order.deliveryDate && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">交货日期</p>
                  <p className="font-medium text-gray-900">{formatDate(order.deliveryDate)}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">总金额</p>
                <p className="font-medium text-gray-900 text-lg">{formatCurrency(order.totalAmount)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">已付金额</p>
                <p className="font-medium text-gray-900">{formatCurrency(order.paidAmount)}</p>
              </div>
            </div>

            {order.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">备注</p>
                <p className="text-gray-900 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </Card>

          {/* 订单项 */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">订单产品</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">总计</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">客户名称</p>
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {order.customer.name}
                </Link>
              </div>
              {order.customer.email && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">邮箱</p>
                  <p className="font-medium text-gray-900">{order.customer.email}</p>
                </div>
              )}
              {order.customer.phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">电话</p>
                  <p className="font-medium text-gray-900">{order.customer.phone}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">统计信息</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">产品数量</span>
                <span className="font-medium text-gray-900">
                  {order.items.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总数量</span>
                <span className="font-medium text-gray-900">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">创建时间</span>
                <span className="font-medium text-gray-900">
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="删除订单"
        message={`确定要删除订单 "${order.orderNo}" 吗？此操作将恢复库存。`}
        danger
      />
    </div>
  );
}
