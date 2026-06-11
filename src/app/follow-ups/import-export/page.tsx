'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PROMPT_EXAMPLE = `你是一名专业的外贸业务员。请为以下客户生成跟进记录和沟通话术。

## 客户信息
- 公司名称: ABC TRADING CO LTD
- 行业: 机械设备
- 国家: 德国
- 联系人: Hans Mueller
- 电话: +49-30-1234567

## 请生成以下内容
1. 跟进记录
2. WhatsApp/邮件话术

## 输出格式
=== 新增跟进 ===
followUpMatters: "报价,谈判"
contactMethod: "whatsapp"
nextAction: "发送报价跟进"
priority: "high"
...

=== 新增话术 ===
type: "whatsapp"
title: "报价跟进"
content: |
  Hi Hans，
  Thank you for your inquiry!
  ...`;

function ImportExportPageContent() {
  const router = useRouter();
  const [exportCustomerId, setExportCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importCustomerId, setImportCustomerId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=200');
      const data = await res.json();
      setCustomers(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleExport = async (customerId?: string) => {
    setExporting(true);
    try {
      const url = customerId ? `/api/follow-ups/export-template?customerId=${customerId}` : '/api/follow-ups/export-template';
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const u = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = u;
        a.download = customerId ? `follow-up-prompt-${customerId}.txt` : 'follow-up-prompt.txt';
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(u); document.body.removeChild(a);
      }
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const handleImport = async () => {
    if (!importCustomerId) { alert('请选择目标客户'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      let res;
      if (importFile) {
        const fd = new FormData(); fd.append('file', importFile); fd.append('customerId', importCustomerId);
        res = await fetch('/api/follow-ups/import-markdown', { method: 'POST', body: fd });
      } else if (importText.trim()) {
        res = await fetch('/api/follow-ups/import-markdown', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: importText, customerId: importCustomerId }),
        });
      } else { alert('请粘贴内容或选择文件'); return; }
      const r = await res.json();
      setImportResult(r);
    } catch (e) { setImportResult({ success: false, error: '导入失败' }); }
    finally { setImporting(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-3xl font-bold text-gray-900">AI 导入导出</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导出 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-blue-600" /><h2 className="text-xl font-semibold text-gray-900">导出 AI 提示词</h2>
          </div>
          <p className="text-sm text-gray-600 mb-2">生成包含客户信息的 AI 提示词，复制到 ChatGPT/Claude 即可生成跟进内容。</p>
          <div className="text-xs text-blue-600 mb-4">💡 提示词已包含客户名称、行业、联系人等信息，AI 会根据上下文生成个性化内容。</div>

          <div className="space-y-4">
            <Button onClick={() => handleExport()} loading={exporting} className="w-full"><Download className="w-4 h-4 mr-1" /> 导出通用提示词模板</Button>
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">按客户导出（含客户上下文）</h3>
              <div className="flex gap-2">
                <select value={exportCustomerId} onChange={(e) => setExportCustomerId(e.target.value)} onFocus={loadCustomers} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">选择客户</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                <Button variant="secondary" onClick={() => handleExport(exportCustomerId)} disabled={!exportCustomerId}>导出</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 导入 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-green-600" /><h2 className="text-xl font-semibold text-gray-900">导入 AI 结果</h2>
          </div>
          <p className="text-sm text-gray-600 mb-2">粘贴 AI 生成的内容或上传文件，自动解析并创建跟进记录和话术。</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标客户 <span className="text-red-500">*</span></label>
              <select value={importCustomerId} onChange={(e) => setImportCustomerId(e.target.value)} onFocus={loadCustomers} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">选择客户</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <textarea value={importText} onChange={(e) => { setImportText(e.target.value); setImportFile(null); }} rows={10} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono" placeholder="粘贴 AI 生成的内容（=== 新增跟进 === ... === 新增话术 === ...）" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>或上传文件：</span>
              <input type="file" accept=".md,.txt" onChange={(e) => { if (e.target.files?.[0]) { setImportFile(e.target.files[0]); setImportText(''); } }} className="flex-1 text-xs" />
            </div>
            <Button onClick={handleImport} loading={importing} disabled={(!importText.trim() && !importFile) || !importCustomerId} className="w-full"><Upload className="w-4 h-4 mr-1" /> 开始导入</Button>
            {importResult && (
              <div className={`p-3 rounded text-sm ${importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {importResult.message || importResult.error || (importResult.success ? '导入成功' : '导入失败')}
                {importResult.results?.filter((r: any) => r.status === 'created').map((r: any, i: number) => (
                  <div key={i} className="text-xs mt-1">✅ {r.type === 'script' ? `话术: ${r.title}` : '跟进记录'}</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 使用说明 */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> 使用流程</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-700 mb-1">1️⃣ 导出提示词</div>
            <p className="text-blue-600 text-xs">选择客户导出，提示词包含客户名称、行业、联系人等上下文信息</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="font-medium text-green-700 mb-1">2️⃣ AI 生成内容</div>
            <p className="text-green-600 text-xs">将提示词发给 ChatGPT/Claude，AI 自动生成跟进记录和话术</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-700 mb-1">3️⃣ 粘贴导入</div>
            <p className="text-purple-600 text-xs">复制 AI 结果粘贴到导入框，选择目标客户，一键导入系统</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ImportExportPage() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><ImportExportPageContent /></Suspense>;
}
