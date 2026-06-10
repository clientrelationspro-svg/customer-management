'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  Truck,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Calendar,
} from 'lucide-react';

const menuItems = [
  { icon: Home, label: '仪表盘', href: '/' },
  { icon: Users, label: '客户管理', href: '/customers' },
  { icon: Calendar, label: '客户跟进', href: '/follow-ups' },
  { icon: Package, label: '产品管理', href: '/products' },
  { icon: Truck, label: '供应商管理', href: '/suppliers' },
  { icon: ShoppingCart, label: '订单管理', href: '/orders' },
  { icon: FileText, label: '文件管理', href: '/files' },
  { icon: BarChart3, label: '数据统计', href: '/reports' },
  { icon: Settings, label: '系统设置', href: '/settings' },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${collapsed ? 'w-0 opacity-0 -translate-x-full' : 'w-64 opacity-100 translate-x-0'}`}>
      <nav className="p-4 space-y-2 min-w-[256px]">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
