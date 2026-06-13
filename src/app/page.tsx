'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, Mail, Phone, TrendingUp, Calendar,
  ChevronRight, Plus, Eye, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface TodayStats {
  customerAdded: number;
  emailSent: number;
  whatsappSent: number;
  phoneCalled: number;
  total: number;
}

interface Activity {
  id: string;
  action: string;
  customerId?: string;
  createdAt: string;
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<TodayStats>({ customerAdded: 0, emailSent: 0, whatsappSent: 0, phoneCalled: 0, total: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // 每10秒自动轮询
    const interval = setInterval(loadStats, 10000);

    // 标签页切回时立即刷新
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadStats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/activities?range=today');
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setActivities(data.data.activities || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      customer_added: '新增客户',
      email_sent: '发送邮件',
      whatsapp_sent: 'WhatsApp 消息',
      phone_called: '拨打电话',
    };
    return map[action] || action;
  };

  const actionColor = (action: string): string => {
    const map: Record<string, string> = {
      customer_added: 'bg-blue-100 text-blue-700',
      email_sent: 'bg-orange-100 text-orange-700',
      whatsapp_sent: 'bg-green-100 text-green-700',
      phone_called: 'bg-purple-100 text-purple-700',
    };
    return map[action] || 'bg-gray-100 text-gray-700';
  };

  const actionIcon = (action: string): string => {
    const map: Record<string, string> = { customer_added: '👤', email_sent: '📧', whatsapp_sent: '💬', phone_called: '📞' };
    return map[action] || '📌';
  };

  const statCards = [
    { icon: Users, label: '新增客户', value: stats.customerAdded, color: 'text-blue-600', bg: 'bg-blue-50', href: '/customers' },
    { icon: MessageSquare, label: 'WhatsApp', value: stats.whatsappSent, color: 'text-green-600', bg: 'bg-green-50', href: '/follow-ups' },
    { icon: Mail, label: '邮件', value: stats.emailSent, color: 'text-orange-600', bg: 'bg-orange-50', href: '/follow-ups' },
    { icon: Phone, label: '电话', value: stats.phoneCalled, color: 'text-purple-600', bg: 'bg-purple-50', href: '/follow-ups' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">今日工作概览 · {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => router.push('/customers/new')} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-1" /> 新增客户
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <button key={card.label} onClick={() => router.push(card.href)}
            className={`${card.bg} rounded-xl p-5 text-left hover:shadow-md transition-shadow border border-transparent hover:border-gray-200`}>
            <div className="flex items-center gap-3 mb-3">
              <card.icon className={`w-8 h-8 ${card.color}`} />
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>
              {loading ? '...' : card.value}
            </p>
            <p className="text-xs text-gray-400 mt-1">今日</p>
          </button>
        ))}
      </div>

      {/* 总计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日活跃度 */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                今日活动记录
              </h2>
              <Button variant="secondary" size="sm" onClick={loadStats}>刷新</Button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">今日暂无活动记录</p>
                <p className="text-gray-400 text-xs mt-1">新增客户或发送消息后这里会显示</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activities.map(act => (
                  <div key={act.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-lg">{actionIcon(act.action)}</span>
                    <span className="flex-1 text-sm text-gray-900">{actionLabel(act.action)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${actionColor(act.action)}`}>
                      {actionLabel(act.action)}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(act.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 快捷入口 */}
        <div>
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              快捷操作
            </h2>
            <div className="space-y-2">
              {[
                { icon: Plus, label: '新增客户', href: '/customers/new', color: 'text-blue-600' },
                { icon: Users, label: '客户列表', href: '/customers', color: 'text-indigo-600' },
                { icon: Calendar, label: '客户开发', href: '/follow-ups', color: 'text-green-600' },
                { icon: Eye, label: '系统设置', href: '/settings', color: 'text-gray-600' },
              ].map(item => (
                <button key={item.href} onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
            
            {/* 今日总计 */}
            <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg text-center">
              <p className="text-xs text-gray-500">今日活跃度</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-1">次操作</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
