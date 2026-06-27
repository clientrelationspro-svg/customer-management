'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Save, UserPlus, CheckCircle, Mail, Package, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import SequencePromptBuilder from '@/components/follow-up/SequencePromptBuilder';
import { buildEmailHtml, formatEmailBody } from '@/lib/email/email-template';

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

const langFlag: Record<string, string> = { zh: '🇨🇳 中文', en: '🇬🇧 English', es: '🇪🇸 Español' };

export default function InquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; filename: string; size: number; type: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDays, setFollowUpDays] = useState('7');
  const [scheduledFollowUps, setScheduledFollowUps] = useState<any[]>([]);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ subject: '', body: '', scheduledAt: '' });

  const fetchInquiry = async () => {
    const r = await fetch(`/api/inquiries/${id}`);
    const d = await r.json();
    if (d.success) {
      setInquiry(d.data);
      if (d.data.aiDraftSubject) setEditSubject(d.data.aiDraftSubject);
      if (d.data.aiDraftBody) setEditBody(d.data.aiDraftBody);
      setAssignCustomerId(d.data.customerId || '');
    }
    setLoading(false);
  };

  const fetchFollowUps = async () => {
    const r = await fetch(`/api/inquiries/${id}/follow-ups`);
    const d = await r.json();
    if (d.success) setScheduledFollowUps(d.data || []);
  };

  useEffect(() => {
    fetchInquiry(); fetchFollowUps();
    fetch('/api/customers?limit=200').then(r => r.json()).then(d => { if (d.success) setCustomers(d.data || []); }).catch(() => {});
  }, [id]);

  const handleSaveDraft = async () => {
    const htmlBody = formatEmailBody(editBody);
    await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalSubject: editSubject, finalBody: htmlBody, customerId: assignCustomerId || null, action: 'review' }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    fetchInquiry();
  };

  // AI 生成邮件（调用后端 regenerateDraft）
  const generateWithAI = async () => {
    if (!userNotes.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerateDraft: true,
          customerId: assignCustomerId || null,
          userNotes: userNotes.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.data?.aiDraftBody) {
        setEditSubject(d.data.aiDraftSubject || `Re: ${inquiry?.subject || ''}`);
        setEditBody(d.data.aiDraftBody);
        setShowNotesInput(false);
        setAiError('');
      } else {
        setAiError(d.error || 'AI 生成失败，请检查 API 配置');
      }
    } catch (e: any) {
      setAiError(`网络错误: ${e?.message || '请检查连接'}`);
    } finally {
      setAiLoading(false);
    }
  };

  // 将用户要点格式化为邮件模板（备用）
  const applyNotes = () => {
    if (!userNotes.trim()) return;
    const points = userNotes.trim().split(/[,，\n]/).filter(p => p.trim());
    const customerName = inquiry?.fromName || inquiry?.fromEmail?.split('@')[0] || 'Sir/Madam';
    const productInfo = inquiry?.productInterested ? `关于 ${inquiry.productInterested}` : '';
    
    const body = `感谢您的来信，${productInfo ? `**${productInfo}**。` : ''}

关于您提到的需求：

${points.map((p, i) => `${i + 1}. ${p.trim()}`).join('\n')}

如有任何疑问，请随时联系。

此致
敬礼`;

    const subject = inquiry?.subject ? `Re: ${inquiry.subject}` : '回复：询价';
    setEditSubject(subject);
    setEditBody(body);
    setShowNotesInput(false);
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUp.subject.trim() || !newFollowUp.body.trim()) return;
    await fetch(`/api/inquiries/${id}/follow-ups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newFollowUp, status: 'pending' }),
    });
    setNewFollowUp({ subject: '', body: '', scheduledAt: '' });
    setShowFollowUpForm(false);
    fetchFollowUps();
  };

  const handleDeleteFollowUp = async (fid: string) => {
    if (!confirm('删除此定时邮件？')) return;
    await fetch(`/api/inquiries/${id}/follow-ups/manage?id=${fid}`, { method: 'DELETE' });
    fetchFollowUps();
  };

  const handleSend = async () => {
    if (!editSubject.trim() || !editBody.trim()) return alert('主题和内容不能为空');
    const confirmMsg = scheduleMode ? `确认设定于 ${scheduledTime} 定时发送？` : '确认立即发送此回复邮件？';
    if (!confirm(confirmMsg)) return;
    setSending(true);
    const htmlBody = buildEmailHtml(editBody, editSubject);
    const res = await fetch(`/api/inquiries/${id}/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: editSubject, body: htmlBody,
        attachments: attachments.map(a => ({ filename: a.filename, path: a.url })),
        scheduledAt: scheduleMode ? scheduledTime : null,
        followUpEnabled, followUpInterval: followUpEnabled ? parseInt(followUpDays) : null,
      }),
    });
    setSending(false);
    if (res.ok) { alert(scheduleMode ? '定时发送已设定！' : '回复已发送！'); fetchInquiry(); }
    else { const e = await res.json(); alert(e.error || '发送失败'); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">加载中...</div>;
  if (!inquiry) return <div className="text-center py-8 text-red-500">邮件不存在</div>;
  const isReplied = inquiry.status === 'replied';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900 truncate flex-1">{inquiry.subject}</h1>
        <button onClick={async () => { if (confirm('确定删除此邮件？')) { await fetch(`/api/inquiries/${id}`, { method: 'DELETE' }); router.push('/inquiries'); } }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="删除邮件"><Trash2 className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="bg-purple-50 rounded-lg p-3 text-sm"><span className="text-xs text-purple-500">感兴趣产品</span><p className="font-medium">{inquiry.productInterested || '-'}</p></div>
                <div className="bg-purple-50 rounded-lg p-3 text-sm"><span className="text-xs text-purple-500">需求数量</span><p className="font-medium">{inquiry.quantity || '-'}</p></div>
                <div className="bg-purple-50 rounded-lg p-3 text-sm"><span className="text-xs text-purple-500">交期要求</span><p className="font-medium">{inquiry.deliveryRequired || '-'}</p></div>
              </div>
              {inquiry.aiSummary && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800"><span className="text-xs text-blue-500 block mb-1">📝 AI 总结</span>{inquiry.aiSummary}</div>
              )}
            </Card>
          )}

          {/* === 回复编辑器 === */}
          {!isReplied && (
            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Send className="w-5 h-5 text-green-600" />回复邮件</h2>

              {/* 提示词输入区 */}
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-purple-700">✏️ 回复提示词（AI 将根据你的要点生成完整邮件）</label>
                  <button onClick={() => setShowNotesInput(!showNotesInput)} className="text-purple-400 hover:text-purple-600 text-xs">
                    {showNotesInput ? '收起' : '展开'}
                  </button>
                </div>
                {showNotesInput && (<>
                  <textarea value={userNotes} onChange={e => { setUserNotes(e.target.value); setAiError(''); }} rows={4}
                    placeholder={`介绍公司主营钽铌矿贸易，有稳定非洲矿源
报CIF价$820/吨，FOB上海$780
强调ISO 9001和CE认证
最小起订量5吨，30天交货
询问客户具体需求和年采购量`}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm resize-y font-mono" />
                  
                  {aiError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{aiError}</div>
                  )}

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-purple-600">
                      {userNotes.trim() ? `${userNotes.trim().split(/[\\n,，]/).filter((p: string) => p.trim()).length} 个要点` : '输入要点作为 AI 提示词'}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={applyNotes} disabled={!userNotes.trim()} className="text-xs">
                        📋 模板排版
                      </Button>
                      <Button size="sm" onClick={generateWithAI} loading={aiLoading} disabled={!userNotes.trim()} className="bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-3 h-3 mr-1" />AI 生成邮件
                      </Button>
                    </div>
                  </div>
                </>)}
              </div>

              {/* 编辑区 */}
              <div className="space-y-3">
                <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium" placeholder="回复主题" />

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                    {uploadingFile ? '上传中...' : '添加附件'}
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setUploadingFile(true);
                      const form = new FormData(); form.append('file', file);
                      const r = await fetch(`/api/inquiries/${id}/upload`, { method: 'POST', body: form });
                      const d = await r.json(); setUploadingFile(false);
                      if (d.success) setAttachments(prev => [...prev, { filename: file.name, url: d.data.url, size: file.size, type: file.type }]);
                    }} />
                  </label>
                  {attachments.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                      📎 {a.filename}
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                    </span>
                  ))}
                </div>

                <MarkdownEditor value={editBody} onChange={setEditBody} uploadUrl={`/api/inquiries/${id}/upload`} placeholder="使用 Markdown 编写回复邮件..." />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={scheduleMode} onChange={e => setScheduleMode(e.target.checked)} className="rounded" />⏰ 定时发送</label>
                  {scheduleMode && <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-xs" />}
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={followUpEnabled} onChange={e => setFollowUpEnabled(e.target.checked)} className="rounded" />🔔 持续跟进</label>
                  {followUpEnabled && <span className="flex items-center gap-1">每隔 <input type="number" value={followUpDays} onChange={e => setFollowUpDays(e.target.value)} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center" min="1" /> 天提醒</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleSaveDraft}><Save className="w-3 h-3 mr-1" />{saved ? '已保存' : '保存草稿'}</Button>
                  <Button size="sm" onClick={handleSend} loading={sending} className={scheduleMode ? 'bg-amber-600 hover:bg-amber-700' : ''}>
                    <Send className="w-3 h-3 mr-1" />{scheduleMode ? '定时发送' : '发送'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 定时跟进序列 */}
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2">⏰ 定时跟进序列 ({scheduledFollowUps.length})</h2>
              <div className="flex items-center gap-1">
                <SequencePromptBuilder customerId={inquiry?.customer?.id} inquirySubject={inquiry?.subject} inquiryBody={inquiry?.body} inquiryId={inquiry?.id} onImport={() => fetchFollowUps()} />
                <button onClick={() => setShowFollowUpForm(!showFollowUpForm)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">+ 手动添加</button>
              </div>
            </div>
            {showFollowUpForm && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <input value={newFollowUp.subject} onChange={e => setNewFollowUp(p => ({ ...p, subject: e.target.value }))} placeholder="邮件主题" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <textarea value={newFollowUp.body} onChange={e => setNewFollowUp(p => ({ ...p, body: e.target.value }))} rows={3} placeholder="邮件正文（Markdown）" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="datetime-local" value={newFollowUp.scheduledAt} onChange={e => setNewFollowUp(p => ({ ...p, scheduledAt: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <Button size="sm" onClick={handleAddFollowUp}>添加</Button>
              </div>
            )}
            {scheduledFollowUps.length === 0 ? (
              <p className="text-center py-4 text-sm text-gray-400">暂无定时跟进邮件</p>
            ) : (
              <div className="space-y-2">
                {scheduledFollowUps.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.subject}</p>
                      <p className="text-xs text-gray-500">{new Date(f.scheduledAt).toLocaleString('zh-CN')} · {f.status}</p>
                    </div>
                    <button onClick={() => handleDeleteFollowUp(f.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右侧栏 */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" />客户匹配</h2>
            <select value={assignCustomerId} onChange={e => setAssignCustomerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2">
              <option value="">选择关联客户</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.companyName}{c.country ? ` (${c.country})` : ''}</option>
              ))}
            </select>
            {inquiry.customer && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 text-blue-600" /><span className="text-blue-700">已关联: {inquiry.customer.companyName}</span>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold mb-3">已发送回复 ({inquiry.replies?.length || 0})</h2>
            {inquiry.replies?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无回复记录</p>
            ) : (
              <div className="space-y-3">
                {inquiry.replies.map((r, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">{r.subject}</span>
                      <span className="text-xs text-gray-500 ml-auto">{new Date(r.sentAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatEmailBody(r.body) }} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
