'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, CheckCircle, Send, Phone, Mail, MessageCircle, X, Clock, Download, Upload, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logActivity } from '@/lib/activity';
import MarkdownEditor, { markdownToHtml } from '@/components/ui/MarkdownEditor';
import { buildEmailHtml, stripMarkdown, formatEmailBody } from '@/lib/email/email-template';

interface Script {
  id: string;
  customerId: string;
  type: 'whatsapp' | 'email' | 'phone';
  title: string;
  content: string;
  lastSentAt?: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

interface FollowUpScriptsProps {
  customerId: string;
  followUpId: string;
  customerPhone?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  currentNextFollowUpDate?: string;
  isArchived?: boolean;
  onDateUpdated?: (lastFollowUpDate: string, nextFollowUpDate: string) => void;
}

export default function FollowUpScripts({
  customerId,
  followUpId,
  customerPhone,
  customerEmail,
  customerWhatsapp,
  currentNextFollowUpDate,
  isArchived = false,
  onDateUpdated,
}: FollowUpScriptsProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [editError, setEditError] = useState('');
  const [formData, setFormData] = useState({ type: 'whatsapp' as Script['type'], title: '', content: '', nextFollowUpDate: '' });

  // 导入导出状态
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/follow-up-scripts?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setScripts(data);
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) fetchScripts();
  }, [customerId, fetchScripts]);

  // 导出话术模板
  const handleExport = async () => {
    setExporting(true);
    try {
      const url = customerId
        ? `/api/follow-ups/export-template?customerId=${customerId}`
        : '/api/follow-ups/export-template';
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `follow-up-template.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  // 导入话术文件
  const [importText, setImportText] = useState('');

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      if (importFile) {
        const fd = new FormData();
        fd.append('file', importFile);
        fd.append('customerId', customerId);
        const res = await fetch('/api/follow-ups/import-markdown', { method: 'POST', body: fd });
        const result = await res.json();
        setImportResult(result);
        if (result.success) { fetchScripts(); setImportFile(null); }
      } else if (importText.trim()) {
        const res = await fetch('/api/follow-ups/import-markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: importText, customerId }),
        });
        const result = await res.json();
        setImportResult(result);
        if (result.success) { fetchScripts(); setImportText(''); }
      } else {
        alert('请粘贴内容或选择文件');
      }
    } catch (error) {
      console.error('Error importing:', error);
      setImportResult({ success: false, error: '导入失败' });
    } finally {
      setImporting(false);
    }
  };

  // 同步下次开发日期到开发记录
  const syncNextFollowUpDate = async (nextDate: string) => {
    if (!nextDate || !followUpId) return;
    try {
      const now = new Date().toISOString();
      await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastFollowUpDate: now,
          nextFollowUpDate: nextDate,
        }),
      });
      // 通知父组件更新表单
      if (onDateUpdated) {
        onDateUpdated(now, nextDate);
      }
    } catch (error) {
      console.error('Error syncing date:', error);
    }
  };

  const handleAdd = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容');
      return;
    }
    try {
      const res = await fetch('/api/follow-up-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, ...formData }),
      });
      if (res.ok) {
        // 如果设置了下次开发日期，同步到开发记录
        if (formData.nextFollowUpDate) {
          await syncNextFollowUpDate(formData.nextFollowUpDate);
        }
        setShowAddForm(false);
        setFormData({ type: 'whatsapp', title: '', content: '', nextFollowUpDate: '' });
        fetchScripts();
      }
    } catch (error) {
      console.error('Error adding script:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容');
      return;
    }
    try {
      const res = await fetch(`/api/follow-up-scripts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        if (formData.nextFollowUpDate) {
          await syncNextFollowUpDate(formData.nextFollowUpDate);
        }
        setEditingId(null);
        setEditError('');
        setFormData({ type: 'whatsapp', title: '', content: '', nextFollowUpDate: '' });
        fetchScripts();
      } else {
        const d = await res.json().catch(() => ({}));
        setEditError(d.error || '保存失败，请重试');
      }
    } catch (error) {
      setEditError('网络错误，请检查连接后重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此话术？')) return;
    try {
      await fetch(`/api/follow-up-scripts/${id}`, { method: 'DELETE' });
      fetchScripts();
    } catch (error) {
      console.error('Error deleting script:', error);
    }
  };

  // 发送话术并更新跟进日期
  const handleSend = async (script: Script) => {
    setSendingId(script.id);
    try {
      const res = await fetch(`/api/follow-up-scripts/${script.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpId,
          nextFollowUpDate: script.nextFollowUpDate || currentNextFollowUpDate || null,
        }),
      });
      if (res.ok) {
        // 记录活动
        const actionMap: Record<string, string> = { whatsapp: 'whatsapp_sent', email: 'email_sent', phone: 'phone_called' };
        logActivity(actionMap[script.type] || 'whatsapp_sent', customerId);
        
        const result = await res.json();
        const effectiveNextDate = script.nextFollowUpDate || currentNextFollowUpDate || '';
        if (onDateUpdated) {
          onDateUpdated(result.sentAt, effectiveNextDate);
        }
        setSentIds(prev => new Set(prev).add(script.id));
        openActionLink(script);
        fetchScripts();
      }
    } catch (error) {
      console.error('Error sending script:', error);
    } finally {
      setSendingId(null);
    }
  };

  // 执行操作：邮件直发 / WhatsApp跳转 / 电话
  const openActionLink = async (script: Script) => {
    switch (script.type) {
      case 'whatsapp': {
        const number = customerWhatsapp?.replace(/\D/g, '') || '';
        if (number) window.open(`https://wa.me/${number}?text=${encodeURIComponent(stripMarkdown(script.content))}`, '_blank');
        break;
      }
      case 'email': {
        // 直接通过 SMTP 发送邮件
        const to = customerEmail || '';
        if (!to) { alert('未找到客户邮箱'); break; }
        try {
          const res = await fetch('/api/email-send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject: script.title, body: buildEmailHtml(script.content, script.title), customerId }),
          });
          if (res.ok) alert('邮件已发送！');
          else alert('发送失败');
        } catch { alert('发送失败'); }
        break;
      }
      case 'phone': {
        window.location.href = `tel:${customerPhone?.replace(/\s/g, '') || ''}`;
        break;
      }
    }
  };




  const startEdit = (script: Script) => {
    setEditingId(script.id);
    setOriginalContent(script.content);
    setEditError('');
    setFormData({
      type: script.type,
      title: script.title,
      content: script.content,
      nextFollowUpDate: script.nextFollowUpDate || '',
    });
  };

  const cancelEdit = () => {
    if (formData.content !== originalContent || formData.title !== scripts.find(s => s.id === editingId)?.title) {
      if (!confirm('内容已修改，确定放弃编辑？')) return;
    }
    setEditingId(null);
    setEditError('');
    setFormData({ type: 'whatsapp', title: '', content: '', nextFollowUpDate: '' });
  };

  const getTypeIcon = (type: Script['type']) => {
    switch (type) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'email': return <Mail className="w-4 h-4 text-orange-500" />;
      case 'phone': return <Phone className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: Script['type']) => {
    switch (type) {
      case 'whatsapp': return 'WhatsApp';
      case 'email': return '邮件';
      case 'phone': return '电话';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getSendButtonColor = (type: Script['type']) => {
    switch (type) {
      case 'whatsapp': return 'bg-green-500 hover:bg-green-600';
      case 'email': return 'bg-orange-500 hover:bg-orange-600';
      case 'phone': return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">开发话术</h2>
        {!isArchived && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport} loading={exporting} title="导出模板">
            <Download className="w-4 h-4 mr-1" /> 导出
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowImport(!showImport); setImportResult(null); setImportFile(null); }} title="导入文件">
            <Upload className="w-4 h-4 mr-1" /> 导入
          </Button>
          <Button variant="secondary" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ type: 'whatsapp', title: '', content: '', nextFollowUpDate: '' }); }}>
            <Plus className="w-4 h-4 mr-1" /> 新话术
          </Button>
        </div>
        )}
      </div>

      {/* 导入区域 */}
      {showImport && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-blue-900 text-sm">导入 AI 生成内容</h3>
            <button onClick={() => { setShowImport(false); setImportText(''); setImportFile(null); setImportResult(null); }} className="p-1 hover:bg-blue-100 rounded"><X className="w-4 h-4 text-blue-600" /></button>
          </div>
          <p className="text-xs text-blue-700 mb-2">
            📋 粘贴 AI 生成的内容或上传文件，自动解析导入
          </p>
          <div className="space-y-3">
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportFile(null); }}
              rows={8}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs font-mono focus:border-blue-500"
              placeholder={`=== 新增开发 ===
followUpMatters: "开发,报价"
contactMethod: "whatsapp"
nextAction: "发送报价单"
...

=== 新增话术 ===
type: "whatsapp"
title: "问候话术"
content: |
  Hi，感谢您的询价！
  我是来自XX公司的销售经理。`}
            />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>或上传文件：</span>
              <input
                type="file"
                accept=".md,.txt"
                onChange={(e) => { if (e.target.files?.[0]) { setImportFile(e.target.files[0]); setImportText(''); } }}
                className="flex-1 text-xs"
              />
            </div>
            <Button size="sm" onClick={handleImport} loading={importing} disabled={!importText.trim() && !importFile}>
              开始导入
            </Button>
          </div>
          {importResult && (
            <div className={`mt-3 p-3 rounded text-xs ${importResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {importResult.message || importResult.error || (importResult.success ? `成功创建 ${importResult.created} 条记录` : '导入失败')}
              {importResult.results?.filter((r: any) => r.status === 'created').length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {importResult.results.filter((r: any) => r.status === 'created').map((r: any, i: number) => (
                    <div key={i}>✅ {r.type === 'script' ? `话术: ${r.title}` : '开发记录'}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 新建话术表单（仅添加时显示，编辑改为 inline） */}
      {showAddForm && !editingId && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-blue-900">新建话术</h3>
            <button onClick={() => { setShowAddForm(false); setFormData({ type: 'whatsapp', title: '', content: '', nextFollowUpDate: '' }); }} className="p-1 hover:bg-blue-100 rounded">
              <X className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">话术类型</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Script['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="whatsapp">WhatsApp 话术</option>
                  <option value="email">邮件话术</option>
                  <option value="phone">电话话术</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">话术标题</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="如: 初次问候、报价开发..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">话术内容</label>
              <MarkdownEditor value={formData.content} onChange={(val) => setFormData({ ...formData, content: val })}
                placeholder={formData.type === 'whatsapp' ? '您好，我是...关于...想跟您沟通一下...' : formData.type === 'email' ? '您好，\n\n关于...\n\n期待您的回复。\n\n此致' : '您好，我是...想跟您电话沟通关于...'}
                rows={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">下次开发日期</label>
              <input type="date" value={formData.nextFollowUpDate} onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <Button onClick={handleAdd}>添加话术</Button>
          </div>
        </div>
      )}

      {/* 话术列表 */}
      {loading ? (
        <div className="text-center py-4 text-gray-500">加载中...</div>
      ) : scripts.length === 0 && !showAddForm ? (
        <div className="text-center py-6 text-gray-500">暂无开发话术，点击"新话术"添加</div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const isEditing = editingId === script.id;
            return isEditing ? (
              /* ====== 原地编辑模式 ====== */
              <div key={script.id} className="p-4 border-2 border-blue-400 rounded-lg bg-blue-50/30 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(script.type)}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                      {getTypeLabel(script.type)} · 编辑中
                    </span>
                  </div>
                  <button onClick={cancelEdit} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="取消编辑">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{editError}</div>
                )}

                <div className="space-y-3">
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="话术标题" />

                  <MarkdownEditor value={formData.content} onChange={(val) => setFormData({ ...formData, content: val })}
                    placeholder={script.type === 'whatsapp' ? 'WhatsApp 消息内容...' : script.type === 'email' ? '邮件正文...' : '电话沟通要点...'}
                    rows={script.type === 'email' ? 8 : 5} />

                  <div className="flex items-center gap-2">
                    <input type="date" value={formData.nextFollowUpDate} onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    <span className="text-xs text-gray-400">下次开发日期</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleUpdate(script.id)}><Save className="w-3 h-3 mr-1" />保存修改</Button>
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>取消</Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ====== 预览模式 ====== */
              <div
                key={script.id}
                className={`p-4 border rounded-lg transition-colors ${script.lastSentAt ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(script.type)}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {getTypeLabel(script.type)}
                    </span>
                    <h4 className="font-medium text-gray-900">{script.title}</h4>
                  </div>
                  {!isArchived && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(script)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(script.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  )}
                </div>

                {/* 话术内容 */}
                <div className="text-sm text-gray-600 mb-3 pl-6 border-l-2 border-gray-200"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(script.content) }} />

                {/* 时间信息行 */}
                <div className="flex flex-wrap items-center gap-3 mb-3 pl-6 text-xs text-gray-500">
                  {script.lastSentAt && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <Clock className="w-3 h-3" />上次发送: {formatDateTime(script.lastSentAt)}
                    </span>
                  )}
                  {script.nextFollowUpDate && (
                    <span className="flex items-center gap-1">📅 下次开发: {new Date(script.nextFollowUpDate).toLocaleDateString('zh-CN')}</span>
                  )}
                  <span className="text-gray-400">创建: {formatDateTime(script.createdAt)}</span>
                </div>

                {/* 操作按钮 */}
                {!isArchived && (
                <div className="flex items-center gap-2 pl-6">
                  {sentIds.has(script.id) ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                      <CheckCircle className="w-4 h-4" />已发送
                    </span>
                  ) : (
                  <button onClick={() => handleSend(script)} disabled={sendingId === script.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${getSendButtonColor(script.type)}`}>
                    <Send className="w-4 h-4" />{sendingId === script.id ? '发送中...' : `发送${getTypeLabel(script.type)}`}
                  </button>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
