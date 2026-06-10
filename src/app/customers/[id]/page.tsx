'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Building2, Phone, Mail, Globe, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Customer {
  id: string;
  companyName: string;
  enterpriseScale?: string;
  country?: string;
  establishDate?: string;
  address?: string;
  regCapital?: string;
  industry?: string;
  employeeCount?: number;
  notes?: string;
  phone?: string;
  fax?: string;
  website?: string;
  email?: string;
  socialMedia?: string;
  contactAddress?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
  orders: Order[];
  files: File[];
  _count?: {
    orders: number;
  };
}

interface Contact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  remarks?: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  orderDate: string;
}

interface File {
  id: string;
  originalName: string;
  fileSize: number;
  createdAt: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      if (result.success) {
        setCustomer(result.data);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此客户吗？此操作不可恢复。')) return;

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/customers');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8 text-red-500">客户不存在</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{customer.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(customer.status)}
              {customer.industry && (
                <span className="text-sm text-gray-500">{customer.industry}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              <span>创建: {formatDateTime(customer.createdAt)}</span>
              <span>更新: {formatDateTime(customer.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/customers/${customerId}/edit`)}
            icon={<Edit size={20} />}
          >
            编辑
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            icon={<Trash2 size={20} />}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">基本信息</h2>
          </div>

          <div className="space-y-3">
            {customer.enterpriseScale && (
              <div>
                <span className="text-sm text-gray-500">企业规模</span>
                <p className="font-medium">{customer.enterpriseScale}</p>
              </div>
            )}

            {customer.country && (
              <div>
                <span className="text-sm text-gray-500">国家</span>
                <p className="font-medium">{customer.country}</p>
              </div>
            )}

            {customer.establishDate && (
              <div>
                <span className="text-sm text-gray-500">成立日期</span>
                <p className="font-medium">{formatDate(customer.establishDate)}</p>
              </div>
            )}

            {customer.regCapital && (
              <div>
                <span className="text-sm text-gray-500">注册资本</span>
                <p className="font-medium">{customer.regCapital}</p>
              </div>
            )}

            {customer.employeeCount !== null && customer.employeeCount !== undefined && (
              <div>
                <span className="text-sm text-gray-500">员工人数</span>
                <p className="font-medium">{customer.employeeCount} 人</p>
              </div>
            )}

            {customer.address && (
              <div>
                <span className="text-sm text-gray-500">公司地址</span>
                <p className="font-medium">{customer.address}</p>
              </div>
            )}

            {customer.notes && (
              <div>
                <span className="text-sm text-gray-500">备注信息</span>
                <p className="font-medium whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">创建日期</span>
              <p className="font-medium text-sm">{formatDateTime(customer.createdAt)}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">更新日期</span>
              <p className="font-medium text-sm">{formatDateTime(customer.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold">联系方式</h2>
          </div>

          <div className="space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">电话</span>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>
            )}

            {customer.fax && (
              <div className="flex items-center gap-2">
                <div>
                  <span className="text-sm text-gray-500">传真</span>
                  <p className="font-medium">{customer.fax}</p>
                </div>
              </div>
            )}

            {customer.website && (
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">网址</span>
                  <p className="font-medium">
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {customer.website}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">邮箱</span>
                  <p className="font-medium">
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {customer.socialMedia && (
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">社媒</span>
                  <p className="font-medium">{customer.socialMedia}</p>
                </div>
              </div>
            )}

            {customer.contactAddress && (
              <div>
                <span className="text-sm text-gray-500">联系地址</span>
                <p className="font-medium">{customer.contactAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* 联系人列表 */}
        <div className="bg-white rounded-lg shadow p-6 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold">联系人</h2>
              <span className="text-sm text-gray-500">（{customer.contacts.length}人）</span>
            </div>
            <Button
              onClick={() => router.push(`/customers/${customerId}/contacts`)}
              size="sm"
            >
              管理联系人
            </Button>
          </div>

          {customer.contacts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              暂无联系人
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">姓名</th>
                    <th className="text-left p-2">职位</th>
                    <th className="text-left p-2">邮箱</th>
                    <th className="text-left p-2">WhatsApp</th>
                    <th className="text-left p-2">电话</th>
                    <th className="text-left p-2">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.contacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{contact.name}</td>
                      <td className="p-2">{contact.position || '-'}</td>
                      <td className="p-2">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                            {contact.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-2">{contact.whatsapp || '-'}</td>
                      <td className="p-2">{contact.phone || '-'}</td>
                      <td className="p-2 text-sm text-gray-500">{contact.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 最近订单 */}
        {customer.orders && customer.orders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">最近订单</h2>
              <Button
                onClick={() => router.push('/orders')}
                size="sm"
                variant="secondary"
              >
                查看全部
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">订单号</th>
                    <th className="text-left p-2">状态</th>
                    <th className="text-left p-2">金额</th>
                    <th className="text-left p-2">日期</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          {order.orderNo}
                        </button>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'completed' ? '已完成' :
                           order.status === 'pending' ? '待处理' :
                           order.status}
                        </span>
                      </td>
                      <td className="p-2">¥{order.totalAmount.toFixed(2)}</td>
                      <td className="p-2">{formatDate(order.orderDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
