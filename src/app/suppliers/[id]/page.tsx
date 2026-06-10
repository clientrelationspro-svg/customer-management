'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Building2, 
  MapPin,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { getStatusBadge } from '@/lib/utils';
import Link from 'next/link';

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  contactPerson: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchSupplier();
  }, [supplierId]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
      } else if (res.status === 404) {
        router.push('/suppliers');
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/suppliers');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!supplier) {
    return <div className="text-center py-8">供应商不存在</div>;
  }

  const statusBadge = getStatusBadge(supplier.status);

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
            <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-gray-600 mt-1">供应商详情</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/suppliers/${supplierId}/edit`)}
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
        {/* 供应商信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">供应商名称</p>
                <p className="font-medium text-gray-900">{supplier.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">状态</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>

              {supplier.contactPerson && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">联系人</p>
                  <p className="font-medium text-gray-900">{supplier.contactPerson}</p>
                </div>
              )}

              {supplier.email && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> 邮箱
                  </p>
                  <p className="font-medium text-gray-900">{supplier.email}</p>
                </div>
              )}

              {supplier.phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> 电话
                  </p>
                  <p className="font-medium text-gray-900">{supplier.phone}</p>
                </div>
              )}

              {supplier.company && (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> 公司
                  </p>
                  <p className="font-medium text-gray-900">{supplier.company}</p>
                </div>
              )}

              {supplier.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> 地址
                  </p>
                  <p className="font-medium text-gray-900">{supplier.address}</p>
                </div>
              )}
            </div>

            {supplier.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">备注</p>
                <p className="text-gray-900 whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            )}
          </Card>

          {/* 产品列表 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">供应产品</h2>
              <Link href={`/products/new?supplierId=${supplierId}`}>
                <Button size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  添加产品
                </Button>
              </Link>
            </div>
            {supplier.products.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无产品</p>
            ) : (
              <div className="space-y-3">
                {supplier.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ¥{product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-600">
                          库存: {product.stock}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
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
                <span className="text-gray-600">产品总数</span>
                <span className="font-medium text-gray-900">
                  {supplier.products.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">创建时间</span>
                <span className="font-medium text-gray-900">
                  {new Date(supplier.createdAt).toLocaleDateString('zh-CN')}
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
        title="删除供应商"
        message={`确定要删除供应商 "${supplier.name}" 吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}
