'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, RefreshCw, Save, UserPlus, CheckCircle, AlertCircle, Mail, Package, Calendar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Inquiry {
  id: string; messageId?: string; fromEmail: string; fromName?: string;
  subject: string; body: string; bodyHtml?: string; language?: string;
  status: string; productInterested?: string; quantity?: string;
  deliveryRequired?: string; aiSummary?: string;
  aiDraftSubject?: string; aiDraftBody?: string;
  finalSubject?: string; finalBody?: string; repliedAt?: string;
  createdAt: string; customer?: { id: string; companyName: string; country?: string; industry?: string };
  replies: { id: string; subject: string; body: string; sentAt: string }[];
}

export default function InquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [replyMode, setReplyMode] = useState<'auto' | 'guided'>('auto');
  const [userNotes, setUserNotes] = useState('');
  const [customers, setCustomers] = useState<{ id: string; companyName: string }[]>([]);

  const fetchInquiry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${id}`);
      const data = await res.json();
      if (data.success) {
        setInquiry(data.data);
        setEditSubject(data.data.finalSubject || data.data.aiDraftSubject || '');
        setEditBody(data.data.finalBody || data.data.aiDraftBody || '');
        setAssignCustomerId(data.data.customer?.id || '');
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInquiry(); fetch('/api/customers?limit=200').then(r => r.json()).then(d => { if (d.success) setCustomers(d.data || []); }).catch(() => {}); }, [id]);

  const handleSaveDraft = async () => {
    await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalSubject: editSubject, finalBody: editBody, customerId: assignCustomerId || null, action: 'review' }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    fetchInquiry();
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const body: any = { regenerateDraft: true, customerId: assignCustomerId || null };
    if (replyMode === 'guided' && userNotes.trim()) {
      body.userNotes = userNotes.trim();
    }
    const res = await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRegenerating(false);
    if (res.ok) {
      const d = await res.json();
      if (d.success) { setEditSubject(d.data.aiDraftSubject); setEditBody(d.data.aiDraftBody); }
    }
  };

  const handleSend = async () => {
    if (!editSubject.trim() || !editBody.trim()) return alert('主题和内容不能为空');
    if (!confirm('确认发送此回复邮件？')) return;
    setSending(true);
    const res = await fetch(`/api/inquiries/${id}/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: editSubject, body: editBody }),
    });
    setSending(false);
    if (res.ok) { alert('回复已发送！'); fetchInquiry(); }
    else { const e = await res.json(); alert(e.error || '发送失败'); }
  };

  const langFlag: Record<string, string> = { zh: '中文', en: 'English', es: 'Español' };

  if (loading) return <div className="text-center py-8">加载中...</div>;
  if (!inquiry) return <div className="text-center py-8 text-red-500">邮件不存在</div>;

  const isReplied = inquiry.status === 'replied';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900 truncate">{inquiry.subject}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：原始邮件 + AI 提取 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 原始邮件 */}
          <Card>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" />原始邮件</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span className="font-medium text-gray-700">{inquiry.fromName || inquiry.fromEmail}</span>
              <span className="text-xs">&lt;{inquiry.fromEmail}&gt;</span>
              {inquiry.language && <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">{langFlag[inquiry.language]}</span>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {inquiry.body || '（无文本内容）'}
            </div>
          </Card>

          {/* AI 提取要点 */}
          {inquiry.productInterested && (
            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Package className="w-5 h-5 text-purple-600" />AI 提取要点</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="bg-purple-50 rounded-lg p-3 text-sm">
                  <span className="text-xs text-purple-500">感兴趣产品</span>
                  <p className="font-medium">{inquiry.productInterested || '-'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-sm">
                  <span className="text-xs text-purple-500">需求数量</span>
                  <p className="font-medium">{inquiry.quantity || '-'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-sm">
                  <span className="text-xs text-purple-500">交期要求</span>
                  <p className="font-medium">{inquiry.deliveryRequired || '-'}</p>
                </div>
              </div>
              {inquiry.aiSummary && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  <span className="text-xs text-blue-500 block mb-1">📝 AI 总结</span>
                  {inquiry.aiSummary}
                </div>
              )}
            </Card>
          )}

          {/* 回复编辑器 */}
          {!isReplied && (
            <Card>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-semibold flex items-center gap-2"><Send className="w-5 h-5 text-green-600" />回复邮件</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant={replyMode === 'guided' ? 'secondary' : 'ghost'} onClick={() => setReplyMode('auto')}
                    className={`text-xs ${replyMode === 'auto' ? 'font-bold bg-blue-50 text-blue-700' : ''}`}>
                    🤖 AI自动生成
                  </Button>
                  <Button size="sm" variant={replyMode === 'auto' ? 'secondary' : 'ghost'} onClick={() => setReplyMode('guided')}
                    className={`text-xs ${replyMode === 'guided' ? 'font-bold bg-amber-50 text-amber-700' : ''}`}>
                    ✍️ 人工引导生成
                  </Button>
                </div>
              </div>

              {/* 人工引导：指令输入 */}
              {replyMode === 'guided' && (
                <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="text-xs font-medium text-amber-700 mb-1 block">💡 输入你的回复要点（AI 将据此生成邮件）</label>
                  <textarea
                    value={userNotes}
                    onChange={e => setUserNotes(e.target.value)}
                    rows={3}
                    placeholder="如：报CIF价$820/吨，强调ISO认证，询问是否需要样品，提醒库存有限..."
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm resize-y"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-amber-500">AI 会结合客户档案和你的要点生成回复</span>
                    <Button size="sm" onClick={handleRegenerate} loading={regenerating}>
                      <RefreshCw className="w-3 h-3 mr-1" />生成回复
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mb-3">
                {replyMode === 'auto' && (
                  <Button size="sm" variant="secondary" onClick={handleRegenerate} loading={regenerating}>
                    <RefreshCw className="w-3 h-3 mr-1" />重新生成
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={handleSaveDraft}>
                  <Save className="w-3 h-3 mr-1" />{saved ? '已保存' : '保存草稿'}
                </Button>
                <Button size="sm" onClick={handleSend} loading={sending}>
                  <Send className="w-3 h-3 mr-1" />{sending ? '发送中...' : '发送'}
                </Button>
              </div>

              <div className="space-y-3">
                <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium" placeholder="回复主题" />
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                  rows={12} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y font-mono" placeholder="回复内容（HTML格式）" />
              </div>
            </Card>
          )}

          {/* 已回复记录 */}
          {inquiry.replies?.length > 0 && (
            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />回复记录</h2>
              <div className="space-y-2">
                {inquiry.replies.map(r => (
                  <div key={r.id} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">{r.subject}</span>
                      <span className="text-xs text-gray-500 ml-auto">{new Date(r.sentAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{r.body.replace(/<[^>]+>/g, '')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 右侧：关联客户 */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5 text-orange-600" />关联客户</h2>
            {!isReplied ? (
              <>
                <select value={assignCustomerId} onChange={e => setAssignCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2">
                  <option value="">选择客户（可选）</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                <Button size="sm" variant="secondary" className="w-full" onClick={async () => {
                  if (assignCustomerId) {
                    await fetch(`/api/inquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: assignCustomerId }) });
                    fetchInquiry();
                  }
                }}>关联客户</Button>
              </>
            ) : inquiry.customer ? (
              <div className="text-sm">
                <p className="font-medium">{inquiry.customer.companyName}</p>
                {inquiry.customer.country && <p className="text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />{inquiry.customer.country}</p>}
                {inquiry.customer.industry && <p className="text-gray-500">{inquiry.customer.industry}</p>}
                <button onClick={() => router.push(`/customers/${inquiry.customer?.id}`)}
                  className="text-blue-600 text-sm mt-2 hover:underline">查看客户详情 →</button>
              </div>
            ) : <p className="text-sm text-gray-400">未关联客户</p>}
          </Card>

          <Card>
            <h2 className="font-semibold mb-3 text-sm">邮件信息</h2>
            <div className="space-y-2 text-xs text-gray-500">
              <div><span className="text-gray-400">收件时间</span><p>{new Date(inquiry.createdAt).toLocaleString('zh-CN')}</p></div>
              <div><span className="text-gray-400">发件人</span><p>{inquiry.fromName || '-'}</p></div>
              <div><span className="text-gray-400">发件邮箱</span><p className="break-all">{inquiry.fromEmail}</p></div>
              <div><span className="text-gray-400">语言</span><p>{langFlag[inquiry.language || ''] || '未知'}</p></div>
              <div><span className="text-gray-400">状态</span><p className={`font-medium ${inquiry.status === 'replied' ? 'text-green-600' : 'text-blue-600'}`}>
                {{new: '新邮件', processing: 'AI处理中', reviewed: '待回复', replied: '已回复', archived: '已归档'}[inquiry.status]}</p></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
