'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckCircle, Calendar, AlertCircle, Mail, MessageCircle, Phone, Edit3, Trash2, Building2, Send, Globe, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { isOverdue } from '@/lib/utils';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import { buildEmailHtml } from '@/lib/email/email-template';

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

  // 标签筛选
  const [tagFilter, setTagFilter] = useState('');

  // 邮箱弹窗
  const [emailModal, setEmailModal] = useState<{ open: boolean; followUp: FollowUp | null }>({ open: false, followUp: null });
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);

  // 日期编辑
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState('');

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
      const htmlBody = buildEmailHtml(emailBody, emailSubject);
      const res = await fetch(`/api/email-send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailModal.followUp.email || emailModal.followUp.customer?.email, subject: emailSubject, body: htmlBody, customerId: emailModal.followUp.customerId, followUpId: emailModal.followUp.id }),
      });
      if (res.ok) { alert('邮件已发送'); setEmailModal({ open: false, followUp: null }); fetchData(); }
      else alert('发送失败');
    } catch {}
    finally { setSending(false); }
  };

  // 自动处理到期任务
  const dueItems = followUps.filter(f => 
    !f.isCompleted && f.nextFollowUpDate && new Date(f.nextFollowUpDate) <= new Date()
  );
  const dueEmails = dueItems.filter(f => f.email || f.customer?.email);
  const dueWhatsapps = dueItems.filter(f => f.whatsapp);

  const processDueEmails = async () => {
    if (dueEmails.length === 0) return;
    setBatchProcessing(true);
    setBatchResult('');
    let sent = 0; let failed = 0;
    for (const f of dueEmails) {
      try {
        const to = f.email || f.customer?.email;
        if (!to) { failed++; continue; }
        const body = f.remarks ? f.remarks.replace(/^【.*】\n收件人:.*\n\n/, '') : `Hi,\n\nFollowing up on our previous conversation.\n\nBest regards`;
        const htmlBody = buildEmailHtml(body);
        const res = await fetch('/api/email-send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject: 'Follow-up', body: htmlBody, customerId: f.customerId, followUpId: f.id }),
        });
        res.ok ? sent++ : failed++;
      } catch { failed++; }
    }
    setBatchResult(`✅ ${sent} 封已发送${failed ? `, ${failed} 封失败` : ''}`);
    setBatchProcessing(false);
    fetchData();
  };

  // 排序 + 状态标签
  const today = new Date().toISOString().split('T')[0];

  const filtered = followUps
    .filter(f =>
      f.customer?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      f.customer?.country?.toLowerCase().includes(search.toLowerCase()) ||
      f.nextAction?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.lastFollowUpDate).getTime() - new Date(a.lastFollowUpDate).getTime());

  // 标签
  const getStatusTag = (f: FollowUp) => {
    if (f.isCompleted) return { label: '✓ 已完成', color: 'bg-green-50 text-green-600' };
    const nd = f.nextFollowUpDate?.split('T')[0];
    if (nd && isOverdue(f.nextFollowUpDate!)) return { label: '🔴 逾期', color: 'bg-red-50 text-red-600' };
    if (nd === today) return { label: '📅 今日', color: 'bg-amber-50 text-amber-600' };
    if (nd) return { label: '📌 待跟进', color: 'bg-blue-50 text-blue-600' };
    return { label: '📋 其他', color: 'bg-gray-50 text-gray-500' };
  };

  const priorityColor = (p: string) => p === 'high' ? 'text-red-600 bg-red-50' : p === 'medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';
  const priorityText = (p: string) => p === 'high' ? '高' : p === 'medium' ? '中' : '低';
  const levelColor = (l: string) => ({ A: 'bg-red-100 text-red-700', B: 'bg-orange-100 text-orange-700', C: 'bg-blue-100 text-blue-700', D: 'bg-green-100 text-green-700', E: 'bg-gray-100 text-gray-500' }[l] || 'bg-gray-100');
  const sentimentIcon = (s?: string) => s === 'positive' ? '😊' : s === 'negative' ? '😡' : s === 'neutral' ? '😐' : '';

  // 统计各标签数量
  const tagCounts: Record<string, number> = {};
  filtered.forEach(f => { const t = getStatusTag(f).label; tagCounts[t] = (tagCounts[t] || 0) + 1; });

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
          { label: '逾期任务', value: filtered.filter(f => !f.isCompleted && f.nextFollowUpDate && isOverdue(f.nextFollowUpDate)).length, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
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

      {/* 到期任务处理横幅 */}
      {dueItems.length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">{dueItems.length} 个到期任务</p>
                <p className="text-xs text-amber-600">
                  {dueEmails.length > 0 && `📧 ${dueEmails.length} 封邮件 `}
                  {dueWhatsapps.length > 0 && `💬 ${dueWhatsapps.length} 条 WhatsApp`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {dueEmails.length > 0 && (
                <Button size="sm" onClick={processDueEmails} loading={batchProcessing}
                  className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Send className="w-3 h-3 mr-1" />一键发送 {dueEmails.length} 封邮件
                </Button>
              )}
              {dueWhatsapps.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => {
                  dueWhatsapps.forEach(f => {
                    const num = f.whatsapp?.replace(/\D/g, '');
                    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(f.nextAction || 'Hi')}`, '_blank');
                  });
                }}>
                  <MessageCircle className="w-3 h-3 mr-1" />打开 {dueWhatsapps.length} 条 WhatsApp
                </Button>
              )}
            </div>
          </div>
          {batchResult && (
            <div className={`mt-2 text-xs p-2 rounded ${batchResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {batchResult}
            </div>
          )}
        </div>
      )}

      {/* 搜索 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input type="text" placeholder="搜索公司名、国家、开发内容..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
      </div>

      {/* 标签筛选栏 */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {[
            { key: '', label: `全部 (${filtered.length})`, color: 'bg-gray-100 text-gray-600' },
            { key: '🔴 逾期', label: `🔴 逾期 (${tagCounts['🔴 逾期'] || 0})`, color: 'bg-red-50 text-red-600' },
            { key: '📅 今日', label: `📅 今日 (${tagCounts['📅 今日'] || 0})`, color: 'bg-amber-50 text-amber-600' },
            { key: '📌 待跟进', label: `📌 待跟进 (${tagCounts['📌 待跟进'] || 0})`, color: 'bg-blue-50 text-blue-600' },
          ].map(t => (
            <button key={t.key} onClick={() => setTagFilter(t.key)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${tagFilter === t.key ? t.color + ' ring-1 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 卡片列表 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>暂无开发记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered
            .filter(f => !tagFilter || getStatusTag(f).label === tagFilter)
            .map((f: FollowUp) => {
              const tag = getStatusTag(f);
              return (
              <div key={f.id} className="bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => router.push(`/follow-ups/${f.id}/edit`)}>

                {/* === 第1行：客户基本信息 === */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${levelColor(f.customer?.level || 'C')}`}>
                    {f.customer?.level || 'C'}
                  </span>
                  <span className="font-semibold text-sm text-gray-900 truncate">{f.customer?.companyName}</span>
                  {f.customer?.country && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
                      <Globe className="w-3 h-3" />{f.customer.country}
                    </span>
                  )}
                  {f.customer?.industry && (
                    <span className="text-[10px] text-gray-400 truncate hidden sm:inline">{f.customer.industry}</span>
                  )}
                  {/* 状态标签 */}
                  <span className={`ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tag.color}`}>
                    {tag.label}
                  </span>
                </div>

                {/* === 第2行：跟进内容 + 优先级 + 阶段 === */}
                <div className="flex items-center gap-2 px-3 pb-1">
                  {f.contactMethod === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :
                   f.contactMethod === 'phone' ? <Phone className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> :
                   <Mail className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {f.nextAction || f.followUpMatters}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityColor(f.priority)}`}>
                    {priorityText(f.priority)}
                  </span>
                  {f.stage && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                      {f.stage}
                    </span>
                  )}
                  {f.replySentiment && (
                    <span className="text-[10px] text-green-600 flex-shrink-0">{sentimentIcon(f.replySentiment)} 回复</span>
                  )}
                </div>

                {/* 邮件内容预览（如果有备注） */}
                {f.remarks && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50 rounded px-2 py-1">
                      📧 {f.remarks.slice(0, 120)}{f.remarks.length > 120 ? '...' : ''}
                    </p>
                  </div>
                )}

                {/* === 第3行：时间线 + 操作按钮 === */}
                <div className="flex items-center gap-2 px-3 pb-3">
                  {/* 时间信息 */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN')}</span>
                    <span className="text-gray-300">→</span>
                    {f.nextFollowUpDate ? (
                      <span className={isOverdue(f.nextFollowUpDate) ? 'text-red-500 font-semibold' : 'text-gray-600'}>
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {new Date(f.nextFollowUpDate).toLocaleDateString('zh-CN')}
                      </span>
                    ) : (
                      <span className="text-gray-300">未设置</span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                    {!f.isCompleted && (
                      <button onClick={() => handleComplete(f.id)} className="px-2 py-1 text-[10px] text-green-600 bg-green-50 hover:bg-green-100 rounded font-medium">
                        <CheckCircle className="w-3 h-3 inline mr-0.5" />完成
                      </button>
                    )}
                    {editingDate === f.id ? (
                      <input type="date" defaultValue={f.nextFollowUpDate?.split('T')[0] || ''}
                        onBlur={e => handleUpdateDate(f.id, e.target.value)}
                        className="px-1 py-1 text-[10px] border border-gray-300 rounded w-28" autoFocus />
                    ) : (
                      <button onClick={() => setEditingDate(f.id)} className="px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 rounded">
                        📅 改期
                      </button>
                    )}
                    {(f.email || f.customer?.email) && (
                      <button onClick={() => openEmail(f)} className="px-2 py-1 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded">
                        发邮件
                      </button>
                    )}
                    {f.whatsapp && (
                      <a href={`https://wa.me/${f.whatsapp.replace(/\D/g,'')}`} target="_blank"
                        className="p-1 text-green-500 hover:bg-green-50 rounded" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => router.push(`/follow-ups/${f.id}/edit`)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(f)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )})}
        </div>
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
