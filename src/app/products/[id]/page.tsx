'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency, getStatusBadge } from '@/lib/utils';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  cost: number | null;
  stock: number;
  minStock: number;
  category: string | null;
  status: string;
  supplier: { id: string; name: string } | null;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  order: {
    id: string;
    orderNo: string;
    status: string;
  };
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else if (res.status === 404) {
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/products');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!product) {
    return <div className="text-center py-8">产品不存在</div>;
  }

  const statusBadge = getStatusBadge(product.status);
  const isLowStock = product.stock <= product.minStock;
  const profitMargin = product.cost 
    ? ((product.price - product.cost) / product.price * 100).toFixed(2)
    : null;

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
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/products/${productId}/edit`)}
          >
            <Edit className="w-5 h-5 mr-2" />
            编辑
          </Button>
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
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">产品名称</p>
                <p className="font-medium text-gray-900">{product.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">SKU</p>
                <p className="font-medium text-gray-900">{product.sku}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">价格</p>
                <p className="font-medium text-gray-900 text-lg">
                  {formatCurrency(product.price)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">成本</p>
                <p className="font-medium text-gray-900">
                  {product.cost ? formatCurrency(product.cost) : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">库存</p>
                <div className="flex items-center gap-2">
                  <p className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock}
                  </p>
                  {isLowStock && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">最低库存</p>
                <p className="font-medium text-gray-900">{product.minStock}</p>
              </div>

              {profitMargin && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">利润率</p>
                  <p className="font-medium text-green-600">{profitMargin}%</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">状态</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>

              {product.category && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">分类</p>
                  <p className="font-medium text-gray-900">{product.category}</p>
                </div>
              )}

              {product.supplier && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">供应商</p>
                  <Link
                    href={`/suppliers/${product.supplier.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {product.supplier.name}
                  </Link>
                </div>
              )}
            </div>

            {product.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">描述</p>
                <p className="text-gray-900 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </Card>

          {/* 订单历史 */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">订单历史</h2>
            {product.orderItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无订单</p>
            ) : (
              <div className="space-y-3">
                {product.orderItems.map((item) => {
                  const orderStatus = getStatusBadge(item.order.status);
                  return (
                    <Link
                      key={item.id}
                      href={`/orders/${item.order.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.order.orderNo}</p>
                          <p className="text-sm text-gray-600">
                            数量: {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${orderStatus.color}`}>
                          {orderStatus.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">统计信息</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">订单数</span>
                <span className="font-medium text-gray-900">
                  {product.orderItems.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">库存状态</span>
                <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                  {isLowStock ? '库存不足' : '库存充足'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">创建时间</span>
                <span className="font-medium text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString('zh-CN')}
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
        title="删除产品"
        message={`确定要删除产品 "${product.name}" 吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}
