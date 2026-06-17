'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Bold, Italic, List, Link, Quote, Heading, Eye, Edit3, Image } from 'lucide-react';

// 简易 Markdown → HTML 转换
function markdownToHtml(md: string): string {
  let html = md
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #ccc; padding-left:10px; color:#666; margin:8px 0;">$1</blockquote>')
    // 粗体 + 斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#1a73e8;">$1</a>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px;">$1</li>')
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // 包裹列表项
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)/g, (match) => {
    if (!match.includes('<ul>')) return `<ul style="margin:8px 0; padding:0;">${match}</ul>`;
    return match;
  });

  return `<div style="font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#333;"><p>${html}</p></div>`;
}

// 在 textarea 中插入文本
function insertAtCursor(textarea: HTMLTextAreaElement, before: string, after: string = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const replacement = before + selected + after;
  textarea.setRangeText(replacement, start, end, 'select');
  textarea.focus();
  textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
}

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  rows?: number;
  uploadUrl?: string;
  onUploadStatus?: (status: string) => void;
}

export default function MarkdownEditor({ value, onChange, placeholder = '', rows = 14, uploadUrl, onUploadStatus }: Props) {
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insert = useCallback((before: string, after: string = '') => {
    const el = textareaRef.current;
    if (el) insertAtCursor(el, before, after);
  }, []);

  // 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadUrl) return;

    setUploading(true);
    onUploadStatus?.('上传中...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.data.markdown) {
        insert(data.data.markdown + '\n');
        onUploadStatus?.('已插入');
        setTimeout(() => onUploadStatus?.(''), 2000);
      } else {
        onUploadStatus?.('上传失败');
      }
    } catch {
      onUploadStatus?.('上传失败');
    }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toolbar = [
    { icon: Bold, label: '粗体', action: () => insert('**', '**') },
    { icon: Italic, label: '斜体', action: () => insert('*', '*') },
    { icon: Heading, label: '标题', action: () => insert('\n## ', '') },
    { icon: Quote, label: '引用', action: () => insert('\n> ', '') },
    { icon: List, label: '列表', action: () => insert('\n- ', '') },
    { icon: Link, label: '链接', action: () => insert('[', '](url)') },
    { icon: Image, label: '插入图片', action: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {toolbar.map(t => (
          <button key={t.label} type="button" onClick={t.action}
            title={t.label}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
            <t.icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={() => setPreview(!preview)}
          title={preview ? '编辑' : '预览'}
          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${preview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'}`}>
          {preview ? <><Edit3 className="w-3 h-3" /> 编辑</> : <><Eye className="w-3 h-3" /> 预览</>}
        </button>
      </div>

      {/* 隐藏文件上传 */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* 编辑/预览区域 */}
      {preview ? (
        <div
          className="p-3 min-h-[280px] max-h-[500px] overflow-y-auto prose prose-sm"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(value) || '<p style="color:#999;">暂无内容</p>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder || '使用 Markdown 格式编写回复...\n\n**粗体** *斜体* [链接](url)\n- 列表项\n> 引用'}
          className="w-full px-3 py-2 text-sm resize-y min-h-[280px] font-mono border-0 focus:ring-0 outline-none"
        />
      )}
    </div>
  );
}

// 导出转换函数供外部使用
export { markdownToHtml };
