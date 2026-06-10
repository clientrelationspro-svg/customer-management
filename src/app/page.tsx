import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { 
  Users, 
  Package, 
  Truck, 
  ShoppingCart, 
  FileText,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const [
    customerCount,
    productCount,
    supplierCount,
    orderCount,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    prisma.customer.count({ where: { status: 'active' } }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.supplier.count({ where: { status: 'active' } }),
    prisma.order.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.product.findMany({
      where: {
        status: 'active',
        stock: { lte: prisma.product.fields.minStock },
      },
      take: 5,
    }),
  ]);

  const totalRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: { status: { in: ['delivered', 'shipped'] } },
  });

  return {
    customerCount,
    productCount,
    supplierCount,
    orderCount,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    recentOrders,
    lowStockProducts,
  };
}

export default async function HomePage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/customers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">客户总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.customerCount}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">产品总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.productCount}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/suppliers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">供应商</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.supplierCount}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">订单总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.orderCount}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 收入统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">总收入</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ¥{Number(stats.totalRevenue).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/customers/new"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium">新增客户</p>
            </Link>
            <Link
              href="/products/new"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium">新增产品</p>
            </Link>
            <Link
              href="/orders/new"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <ShoppingCart className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium">创建订单</p>
            </Link>
            <Link
              href="/files"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="font-medium">文件管理</p>
            </Link>
          </div>
        </Card>
      </div>

      {/* 最近订单和低库存提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近订单</h3>
          {stats.recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无订单</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNo}</p>
                    <p className="text-sm text-gray-600">{order.customer.companyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ¥{Number(order.totalAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            库存预警
          </h3>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">库存充足</p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">库存: {product.stock}</p>
                    <p className="text-sm text-gray-600">最低: {product.minStock}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
