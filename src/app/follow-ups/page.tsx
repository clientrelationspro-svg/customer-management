'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Archive,
  Phone,
  Mail,
  MessageSquare,
  Download,
} from 'lucide-react';

// WhatsApp 直达链接 - 格式化号码
function getWhatsAppUrl(whatsapp: string): string {
  // 去除非数字字符，确保包含国家代码
  let number = whatsapp.replace(/\D/g, '');
  // 如果以00开头，替换为不带前缀
  if (number.startsWith('00')) number = number.slice(2);
  // 确保有国家代码（不含+号）
  return `https://wa.me/${number}`;
}
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatDate, isOverdue } from '@/lib/utils';

interface FollowUp {
  id: string;
  customerId: string;
  contactId?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  followUpMatters: string;
  contactMethod: string;
  nextAction?: string;
  priority: string;
  status: string;
  lastFollowUpDate: string;
  nextFollowUpDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; companyName: string };
  contact?: { id: string; name: string; phone?: string; email?: string; whatsapp?: string };
}

function FollowUpsPageContent() {
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/follow-ups?${params}`);
      const data = await res.json();
      
      setFollowUps(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleDelete = async () => {
    if (!selectedFollowUp) return;
    
    try {
      const res = await fetch(`/api/follow-ups/${selectedFollowUp.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchFollowUps();
        setIsDeleteModalOpen(false);
        setSelectedFollowUp(null);
      }
    } catch (error) {
      console.error('Error deleting follow-up:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'archived': return '已归档';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const getFollowUpMattersText = (matters: string) => {
    const matterMap: { [key: string]: string } = {
      '开发': '开发',
      '报价': '报价',
      '样品': '样品',
      '谈判': '谈判',
      '成交': '成交',
      '其他': '其他',
    };
    return matters.split(',').map(m => matterMap[m] || m).join(', ');
  };

  const getContactMethodText = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'phone': '电话',
      'email': '邮件',
      'whatsapp': 'WhatsApp',
      'wechat': '微信',
      'other': '其他',
    };
    return methodMap[method] || method;
  };

  const filteredFollowUps = followUps.filter(followUp => 
    followUp.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (followUp.contact?.name && followUp.contact.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">客户跟进</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/follow-ups/import-export')}>
            <Download className="w-5 h-5 mr-2" />
            导入导出
          </Button>
          <Button onClick={() => router.push('/follow-ups/new')}>
            <Plus className="w-5 h-5 mr-2" />
            新建跟进
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索公司或联系人..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-nowrap"
            >
              <option value="">全部状态</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="archived">已归档</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-nowrap"
            >
              <option value="">全部优先级</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <div className="flex items-center text-sm text-gray-600 whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              共 {filteredFollowUps.length} 条
            </div>
          </div>
        </div>
      </Card>

      {/* 跟进列表 */}
      <Card>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无跟进记录</div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredFollowUps.map((followUp) => {
              const overdue = followUp.nextFollowUpDate && isOverdue(followUp.nextFollowUpDate);
              const daysOverdue = overdue ? 
                Math.floor((new Date().getTime() - new Date(followUp.nextFollowUpDate!).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              
              return (
                <div
                  key={followUp.id}
                  className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                  onClick={() => router.push(`/follow-ups/${followUp.id}/edit`)}
                >
                  {/* 移动端：垂直布局 */}
                  <div className="block md:hidden">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {followUp.customer.companyName}
                        </h3>
                        {followUp.contact && (
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            👤 {followUp.contact.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/follow-ups/${followUp.id}/edit`);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFollowUp(followUp);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(followUp.priority)}`}>
                        {getPriorityText(followUp.priority)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        {getStatusIcon(followUp.status)}
                        {getStatusText(followUp.status)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {/* 电话直达按钮 */}
                      {followUp.phone && (
                        <a
                          href={`tel:${followUp.phone.replace(/\s/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                        >
                          📞
                        </a>
                      )}
                      {/* WhatsApp 直达按钮 */}
                      {followUp.whatsapp && (
                        <a
                          href={getWhatsAppUrl(followUp.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      )}
                      {/* 邮箱直达按钮 */}
                      {followUp.email && (
                        <a
                          href={`mailto:${followUp.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
                        >
                          📧
                        </a>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-1.5 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{getFollowUpMattersText(followUp.followUpMatters)} · {getContactMethodText(followUp.contactMethod)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">上次: {formatDate(followUp.lastFollowUpDate)}</span>
                        {followUp.nextFollowUpDate && (
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            下次: {formatDate(followUp.nextFollowUpDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {followUp.nextAction && (
                      <p className="text-xs text-gray-600 truncate">
                        下一步: {followUp.nextAction}
                      </p>
                    )}
                  </div>

                  {/* 桌面端：水平布局 */}
                  <div className="hidden md:block">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {followUp.customer.companyName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(followUp.priority)}`}>
                            {getPriorityText(followUp.priority)}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            {getStatusIcon(followUp.status)}
                            {getStatusText(followUp.status)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {followUp.contact && (
                            <p className="text-sm text-gray-600">
                              联系人: {followUp.contact.name}
                            </p>
                          )}
                          {/* 电话直达按钮 */}
                          {followUp.phone && (
                            <a
                              href={`tel:${followUp.phone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                              title={`电话: ${followUp.phone}`}
                            >
                              📞 电话
                            </a>
                          )}
                          {/* WhatsApp 直达按钮 */}
                          {followUp.whatsapp && (
                            <a
                              href={getWhatsAppUrl(followUp.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-full transition-colors"
                              title={`WhatsApp: ${followUp.whatsapp}`}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              WhatsApp
                            </a>
                          )}
                          {/* 邮箱直达按钮 */}
                          {followUp.email && (
                            <a
                              href={`mailto:${followUp.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-colors"
                              title={`邮箱: ${followUp.email}`}
                            >
                              📧 邮箱
                            </a>
                          )}
                          {/* 微信联系提示 */}
                          {followUp.contactMethod === 'wechat' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-600 bg-green-50 rounded-full">
                              💬 微信联系
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {getFollowUpMattersText(followUp.followUpMatters)}
                          </span>
                          <span className="flex items-center gap-1">
                            {getContactMethodText(followUp.contactMethod)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>上次: {formatDate(followUp.lastFollowUpDate)}</span>
                          {followUp.nextFollowUpDate && (
                            <span className={overdue ? 'text-red-600 font-medium' : ''}>
                              下次: {formatDate(followUp.nextFollowUpDate)}
                              {overdue && ` (逾期${daysOverdue}天)`}
                            </span>
                          )}
                        </div>
                        
                        {followUp.nextAction && (
                          <p className="text-sm text-gray-600 mt-2">
                            下一步: {followUp.nextAction}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/follow-ups/${followUp.id}/edit`);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFollowUp(followUp);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedFollowUp(null);
        }}
        onConfirm={handleDelete}
        title="删除跟进记录"
        message={`确定要删除这条跟进记录吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <FollowUpsPageContent />
    </Suspense>
  );
}
