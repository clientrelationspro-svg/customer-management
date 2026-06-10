'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  const [formData, setFormData] = useState({
    customerId: preselectedCustomerId || '',
    status: 'pending',
    notes: '',
    deliveryDate: '',
  });
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=100');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100&status=active');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('请选择客户');
      return;
    }
    
    if (orderItems.length === 0) {
      alert('请添加至少一个产品');
      return;
    }

    setLoading(true);

    try {
      const items = orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          status: formData.status,
          totalAmount,
          notes: formData.notes,
          deliveryDate: formData.deliveryDate || null,
          items,
        }),
      });

      if (res.ok) {
        router.push('/orders');
      } else {
        const error = await res.json();
        alert(error.error || '创建失败');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addOrderItem = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      alert('该产品已添加，请直接修改数量');
      return;
    }

    setOrderItems([
      ...orderItems,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
      },
    ]);
    
    setShowProductSearch(false);
    setProductSearch('');
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    setOrderItems(newItems);
  };

  const updateOrderItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    
    const newItems = [...orderItems];
    newItems[index].unitPrice = price;
    setOrderItems(newItems);
  };

  const removeOrderItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">创建订单</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主表单 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">订单信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    客户 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择客户</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="shipped">已发货</option>
                      <option value="delivered">已送达</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      交货日期
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入订单备注"
                  />
                </div>
              </div>
            </Card>

            {/* 订单项 */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">订单产品</h2>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加产品
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无产品，请点击"添加产品"按钮
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={item.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">数量:</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateOrderItemQuantity(index, parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">单价:</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItemPrice(index, parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-medium text-gray-900">
                          ¥{(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* 侧边栏 - 订单摘要 */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">订单摘要</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">产品数量</span>
                  <span className="font-medium text-gray-900">{orderItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总数量</span>
                  <span className="font-medium text-gray-900">
                    {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">总计</span>
                    <span className="text-lg font-bold text-blue-600">
                      ¥{getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button type="submit" loading={loading} className="w-full">
                <Save className="w-5 h-5 mr-2" />
                创建订单
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="w-full"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* 产品搜索模态框 */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">选择产品</h2>
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setProductSearch('');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索产品名称或SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">暂无产品</p>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addOrderItem(product)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">¥{product.price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">库存: {product.stock}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <NewOrderPageContent />
    </Suspense>
  );
}
