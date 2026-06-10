'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TEMPLATE_EXAMPLE = `=== 新增跟进 ===
phone: "+86-139-0000-0000"
followUpMatters: "开发,报价"
contactMethod: "whatsapp"
nextFollowUpDate: "2026-06-15"

=== 新增话术 ===
type: "whatsapp"
title: "初次问候"
content: |
  Hi，感谢您的询价！
  我是来自XX公司的销售经理。
nextFollowUpDate: "2026-06-15"

type: "email"
title: "报价邮件"
content: |
  尊敬的客户：
  感谢您的询价，请查收报价！
nextFollowUpDate: ""`;

function ImportExportPageContent() {
  const router = useRouter();
  const [exportCustomerId, setExportCustomerId] = useState('');
  const [importCustomerId, setImportCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=200');
      const data = await res.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleExport = async (customerId?: string) => {
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
        a.download = customerId ? `follow-up-template-${customerId}.md` : 'follow-up-template.md';
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

  const handleImport = async () => {
    if (!importFile) { alert('请选择要导入的文件'); return; }
    if (!importCustomerId) { alert('请选择目标客户'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('customerId', importCustomerId);
      const res = await fetch('/api/follow-ups/import-markdown', { method: 'POST', body: formData });
      const result = await res.json();
      setImportResult(result);
    } catch (error) {
      console.error('Error importing:', error);
      setImportResult({ success: false, error: '导入失败' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">导入导出</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导出区域 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">导出模板</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            导出 Markdown 格式模板，包含已有跟进记录和空白模板。将文件交给 AI 填写后导入。
          </p>
          <div className="space-y-4">
            <Button onClick={() => handleExport()} loading={exporting} className="w-full">
              <Download className="w-4 h-4 mr-1" /> 导出通用模板
            </Button>
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">按客户导出</h3>
              <div className="flex gap-2">
                <select value={exportCustomerId} onChange={(e) => setExportCustomerId(e.target.value)} onFocus={loadCustomers} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">选择客户（含已有记录）</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.companyName}</option>))}
                </select>
                <Button variant="secondary" onClick={() => handleExport(exportCustomerId)} disabled={!exportCustomerId}>导出</Button>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-1">使用流程</h4>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
              <li>导出模板 → 获得 .md 文件</li>
              <li>将文件交给 AI 填写（AI 会在标记区域填入内容）</li>
              <li>在此选择目标客户，上传 AI 填好的文件</li>
              <li>系统自动解析并创建跟进记录和话术</li>
            </ol>
          </div>
        </Card>

        {/* 导入区域 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">导入文件</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            上传 AI 生成的 .md 或 .txt 文件，自动识别跟进记录和话术内容。
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标客户 <span className="text-red-500">*</span>
              </label>
              <select value={importCustomerId} onChange={(e) => setImportCustomerId(e.target.value)} onFocus={loadCustomers} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">选择客户</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.companyName}</option>))}
              </select>
              <p className="text-xs text-gray-500 mt-1">所有导入内容将关联到此客户（无需在文件中指定客户 ID）</p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">拖拽文件到此处，或点击选择</p>
              <input type="file" accept=".md,.txt,.yaml,.yml" onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); }} className="block mx-auto text-sm" />
              {importFile && (<p className="mt-2 text-sm text-blue-600 font-medium">已选择: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>)}
            </div>
            <Button onClick={handleImport} loading={importing} disabled={!importFile || !importCustomerId} className="w-full">
              <Upload className="w-4 h-4 mr-1" /> {importing ? '导入中...' : '开始导入'}
            </Button>
            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                  <span className={`font-medium ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>{importResult.success ? '导入成功' : '导入失败'}</span>
                </div>
                {importResult.message && <p className="text-sm text-gray-700 mb-2">{importResult.message}</p>}
                {importResult.error && <p className="text-sm text-red-600">{importResult.error}</p>}
                {importResult.results && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {importResult.results.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {r.status === 'created' ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />}
                        <span className="text-gray-600">
                          {r.type === 'followUp' && r.status === 'created' && '跟进记录已创建'}
                          {r.type === 'script' && r.status === 'created' && `话术"${r.title}"已创建`}
                          {r.status === 'error' && `创建失败: ${r.error}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="w-4 h-4" /> 模板格式示例
            </h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">{TEMPLATE_EXAMPLE}</pre>
            <div className="mt-2 text-xs text-gray-500">
              每个 type: 行就是一个新话术的起点。AI 按此格式填充即可。
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ImportExportPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <ImportExportPageContent />
    </Suspense>
  );
}
