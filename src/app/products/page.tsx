'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency, getStatusBadge } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  category: string | null;
  status: string;
  supplier: { name: string } | null;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      
      setProducts(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // 获取所有分类
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/products/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchProducts();
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">产品管理</h1>
        <Button onClick={() => router.push('/products/new')}>
          <Plus className="w-5 h-5 mr-2" />
          新增产品
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索产品名称、SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部分类</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
          </select>
        </div>
      </Card>

      {/* 产品列表 */}
      <Card>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无产品数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">产品信息</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">价格</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">库存</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">分类</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusBadge = getStatusBadge(product.status);
                  const isLowStock = product.stock <= product.minStock;
                  return (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.supplier && (
                              <p className="text-sm text-gray-600">
                                供应商: {product.supplier.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{product.sku}</td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {product.category || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/products/${product.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/products/${product.id}/edit`)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
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
          setSelectedProduct(null);
        }}
        onConfirm={handleDelete}
        title="删除产品"
        message={`确定要删除产品 "${selectedProduct?.name}" 吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}
