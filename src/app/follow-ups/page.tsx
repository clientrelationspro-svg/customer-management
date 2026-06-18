'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronDown, ChevronUp, CheckCircle, Calendar, Clock, AlertCircle, Mail, MessageCircle, Phone, Edit3, Trash2, Building2, MapPin, Send, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { isOverdue } from '@/lib/utils';
import MarkdownEditor, { markdownToHtml } from '@/components/ui/MarkdownEditor';

interface FollowUp {
  id: string; customerId: string; contactId?: string; phone?: string; whatsapp?: string; email?: string;
  followUpMatters: string; contactMethod: string; nextAction?: string; priority: string; status: string;
  lastFollowUpDate: string; nextFollowUpDate?: string; remarks?: string; stage?: string;
  isCompleted: boolean; replySentiment?: string; replyKeyPoints?: string;
  createdAt: string; updatedAt: string;
  customer: { id: string; companyName: string; country?: string; level?: string; industry?: string; email?: string };
  contact?: { id: string; name: string; position?: string; phone?: string; email?: string; whatsapp?: string };
}

export default function FollowUpsPage() {
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ active: 0, monthTotal: 0, monthEmails: 0 });

  // 分组折叠
  const [groups, setGroups] = useState<Record<string, boolean>>({ overdue: false, today: false, upcoming: false, other: false });

  // 邮箱弹窗
  const [emailModal, setEmailModal] = useState<{ open: boolean; followUp: FollowUp | null }>({ open: false, followUp: null });
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);

  // 日期编辑
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/follow-ups?limit=200');
      const data = await res.json();
      if (data.success) {
        const list = data.data || [];
        setFollowUps(list);
        // 统计
        setStats({
          active: list.filter((f: FollowUp) => f.status === 'in_progress').length,
          monthTotal: list.filter((f: FollowUp) => new Date(f.createdAt).getMonth() === new Date().getMonth()).length,
          monthEmails: list.filter((f: FollowUp) => f.contactMethod === 'email' && new Date(f.createdAt).getMonth() === new Date().getMonth()).length,
        });
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplete = async (id: string) => {
    await fetch(`/api/follow-ups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', isCompleted: true }) });
    fetchData();
  };

  const handleUpdateDate = async (id: string, date: string) => {
    await fetch(`/api/follow-ups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nextFollowUpDate: date }) });
    setEditingDate(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/follow-ups/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    fetchData();
  };

  // 发邮件
  const openEmail = (f: FollowUp) => {
    setEmailModal({ open: true, followUp: f });
    setEmailSubject(f.nextAction ? `Re: ${f.nextAction.slice(0, 50)}` : '');
    setEmailBody('');
  };

  const sendEmail = async () => {
    if (!emailModal.followUp) return;
    setSending(true);
    try {
      const htmlBody = emailBody.includes('<') ? emailBody : markdownToHtml(emailBody);
      const res = await fetch(`/api/email-send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailModal.followUp.email || emailModal.followUp.customer?.email, subject: emailSubject, body: htmlBody, customerId: emailModal.followUp.customerId }),
      });
      if (res.ok) { alert('邮件已发送'); setEmailModal({ open: false, followUp: null }); fetchData(); }
      else alert('发送失败');
    } catch {}
    finally { setSending(false); }
  };

  // 分组排序
  const today = new Date().toISOString().split('T')[0];
  const overdue: FollowUp[] = [];
  const todayList: FollowUp[] = [];
  const upcoming: FollowUp[] = [];
  const other: FollowUp[] = [];

  const filtered = followUps.filter(f =>
    f.customer?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    f.customer?.country?.toLowerCase().includes(search.toLowerCase()) ||
    f.nextAction?.toLowerCase().includes(search.toLowerCase())
  );

  filtered.forEach(f => {
    const nd = f.nextFollowUpDate?.split('T')[0];
    if (nd && isOverdue(f.nextFollowUpDate!) && !f.isCompleted) overdue.push(f);
    else if (nd === today && !f.isCompleted) todayList.push(f);
    else if (nd && nd > today && !f.isCompleted) upcoming.push(f);
    else other.push(f);
  });

  // A/B级优先排序
  [overdue, todayList, upcoming, other].forEach(g => g.sort((a, b) => {
    const la = a.customer?.level || 'Z';
    const lb = b.customer?.level || 'Z';
    return la.localeCompare(lb);
  }));

  const priorityColor = (p: string) => p === 'high' ? 'text-red-600 bg-red-50' : p === 'medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';
  const priorityText = (p: string) => p === 'high' ? '高' : p === 'medium' ? '中' : '低';
  const levelColor = (l: string) => ({ A: 'bg-red-100 text-red-700', B: 'bg-orange-100 text-orange-700', C: 'bg-blue-100 text-blue-700', D: 'bg-green-100 text-green-700', E: 'bg-gray-100 text-gray-500' }[l] || 'bg-gray-100');
  const sentimentIcon = (s?: string) => s === 'positive' ? '😊' : s === 'negative' ? '😡' : s === 'neutral' ? '😐' : '';

  const GroupSection = ({ title, icon: Icon, color, list, groupKey }: any) => {
    if (list.length === 0) return null;
    const isOpen = groups[groupKey];
    return (
      <div className="mb-4">
        <button onClick={() => setGroups(g => ({ ...g, [groupKey]: !isOpen }))}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${color} hover:opacity-90 transition-opacity`}>
          <Icon className="w-4 h-4" /> {title} ({list.length})
          {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {isOpen && (
          <div className="space-y-2 mt-2">
            {list.map((f: FollowUp) => (
              <div key={f.id} className="bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-3 cursor-pointer"
                onClick={() => router.push(`/follow-ups/${f.id}/edit`)}>
                {/* 头部 */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${levelColor(f.customer?.level || 'C')}`}>{f.customer?.level || 'C'}</span>
                    <span className="font-medium text-sm text-gray-900 truncate">{f.customer?.companyName}</span>
                    {f.customer?.country && <span className="text-xs text-gray-400">{f.customer.country}</span>}
                    {f.stage && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{f.stage}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColor(f.priority)}`}>{priorityText(f.priority)}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${f.isCompleted ? 'bg-green-100 text-green-700' : f.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                    {f.isCompleted ? '已完成' : f.status === 'archived' ? '已归档' : '进行中'}
                  </span>
                </div>

                {/* 内容行 */}
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mb-1.5">
                  {f.contactMethod === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-green-500" /> : f.contactMethod === 'phone' ? <Phone className="w-3 h-3 text-blue-500" /> : <Mail className="w-3 h-3 text-orange-500" />}
                  <span>{f.nextAction || f.followUpMatters}</span>
                  {f.replySentiment && <span className="text-gray-400">{sentimentIcon(f.replySentiment)} 客户已回复</span>}
                </div>

                {/* 底部信息 */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN')}</span>
                  {f.nextFollowUpDate && (
                    <span className={isOverdue(f.nextFollowUpDate) ? 'text-red-500 font-medium' : ''}>
                      <Calendar className="w-3 h-3 inline mr-0.5" />
                      {isOverdue(f.nextFollowUpDate) ? '逾期 ' : '下次 '}{new Date(f.nextFollowUpDate).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                  {f.replyKeyPoints && <span className="text-amber-600 truncate max-w-[200px]">💬 {f.replyKeyPoints}</span>}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                  {!f.isCompleted && (
                    <button onClick={() => handleComplete(f.id)} className="px-2 py-0.5 text-[10px] text-green-600 bg-green-50 hover:bg-green-100 rounded">
                      <CheckCircle className="w-3 h-3 inline mr-0.5" />完成
                    </button>
                  )}
                  {editingDate === f.id ? (
                    <input type="date" defaultValue={f.nextFollowUpDate?.split('T')[0] || ''}
                      onBlur={e => handleUpdateDate(f.id, e.target.value)}
                      className="px-1 py-0.5 text-[10px] border border-gray-300 rounded w-28" />
                  ) : (
                    <button onClick={() => setEditingDate(f.id)} className="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 rounded">
                      <Calendar className="w-3 h-3 inline mr-0.5" />改期
                    </button>
                  )}
                  {(f.email || f.customer?.email) && (
                    <button onClick={() => openEmail(f)} className="px-2 py-0.5 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded">
                      <Send className="w-3 h-3 inline mr-0.5" />发邮件
                    </button>
                  )}
                  <div className="flex items-center gap-0.5 ml-auto">
                    {f.whatsapp && <a href={`https://wa.me/${f.whatsapp.replace(/\D/g,'')}`} target="_blank" className="p-1 text-green-500 hover:bg-green-50 rounded"><MessageCircle className="w-3 h-3" /></a>}
                    <button onClick={() => router.push(`/follow-ups/${f.id}/edit`)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => setDeleteTarget(f)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* 头部 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">客户开发</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/follow-ups/import-export')}>导入导出</Button>
          <Button size="sm" onClick={() => router.push('/follow-ups/new')}><Plus className="w-4 h-4 mr-1" />新建开发</Button>
        </div>
      </div>

      {/* 仪表盘 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { label: '活跃客户', value: stats.active, icon: Building2, color: 'text-blue-600 bg-blue-50' },
          { label: '本月开发', value: stats.monthTotal, icon: Calendar, color: 'text-green-600 bg-green-50' },
          { label: '本月邮件', value: stats.monthEmails, icon: Mail, color: 'text-purple-600 bg-purple-50' },
          { label: '逾期任务', value: overdue.length, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(s => (
          <Card key={s.label} className="!p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input type="text" placeholder="搜索公司名、国家、开发内容..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
      </div>

      {/* 分组时间线 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>暂无开发记录</p>
        </div>
      ) : (
        <>
          <GroupSection title="🔴 逾期任务" icon={AlertCircle} color="bg-red-50 text-red-700" list={overdue} groupKey="overdue" />
          <GroupSection title="📅 今天" icon={Calendar} color="bg-amber-50 text-amber-700" list={todayList} groupKey="today" />
          <GroupSection title="📌 后续跟进" icon={Clock} color="bg-blue-50 text-blue-700" list={upcoming} groupKey="upcoming" />
          <GroupSection title="📋 其他" icon={CheckCircle} color="bg-gray-50 text-gray-600" list={other} groupKey="other" />
        </>
      )}

      {/* 发邮件弹窗 */}
      {emailModal.open && emailModal.followUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEmailModal({ open: false, followUp: null })}>
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">发邮件给 {emailModal.followUp.customer?.companyName}</h3>
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
              placeholder="主题" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
            <MarkdownEditor value={emailBody} onChange={setEmailBody} placeholder="邮件内容（Markdown）..." rows={8} />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => setEmailModal({ open: false, followUp: null })}>取消</Button>
              <Button size="sm" onClick={sendEmail} loading={sending}><Send className="w-3 h-3 mr-1" />发送</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="删除开发记录" message="确定删除？此操作不可撤销。" danger />
    </div>
  );
}
