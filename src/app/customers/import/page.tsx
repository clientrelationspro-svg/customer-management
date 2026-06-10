'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ImportCustomersPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  // 下载模板
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/customers/import/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('下载模板失败，请稍后重试');
    }
  };

  // 处理文件上传
  const handleUpload = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
      alert('请上传Excel文件（.xlsx 或 .xls格式）');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadResult({
          success: true,
          data: result.data,
        });
      } else {
        setUploadResult({
          success: false,
          error: result.error || '导入失败',
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadResult({
        success: false,
        error: '上传失败，请稍后重试',
      });
    } finally {
      setUploading(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  // 处理拖拽上传
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">批量导入客户</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左列：下载模板 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">步骤1：下载模板</h2>
              <p className="text-sm text-gray-500">获取标准Excel导入模板</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            请先下载Excel模板，按照模板格式填写客户信息和联系人信息，然后上传文件进行批量导入。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">模板字段说明（支持中英文表头）：</h3>
            <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
              <div>• company_name / 公司名称 *</div>
              <div>• enterprise_scale / 企业规模</div>
              <div>• country / 国家</div>
              <div>• establish_date / 成立日期</div>
              <div>• address / 地址</div>
              <div>• reg_capital / 注册资本</div>
              <div>• industry / 公司行业</div>
              <div>• employee_count / 员工人数</div>
              <div>• notes / 备注信息</div>
              <div>• phone / 电话</div>
              <div>• fax / 传真</div>
              <div>• website / 网址</div>
              <div>• email / 邮箱</div>
              <div>• social_media / 社媒</div>
              <div>• contact_address / 联系地址</div>
              <div>• contact_name / 联系人姓名</div>
              <div>• contact_position / 联系人职位</div>
              <div>• contact_email / 联系人邮箱</div>
              <div>• contact_whatsapp / 联系人WhatsApp</div>
              <div>• contact_phone / 联系人电话</div>
              <div>• contact_remarks / 联系人备注</div>
            </div>
            <p className="text-xs text-blue-600 mt-2">提示：建议使用英文表头避免编码问题</p>
          </div>

          <Button
            onClick={downloadTemplate}
            icon={<Download size={16} />}
            className="w-full"
          >
            下载Excel模板
          </Button>
        </div>

        {/* 右列：上传文件 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Upload size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">步骤2：上传文件</h2>
              <p className="text-sm text-gray-500">上传填写好的Excel文件</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            选择或拖拽Excel文件到下方区域，系统将自动解析并导入客户和联系人信息。
          </p>

          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600">正在导入...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FileText size={48} className="text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  点击选择或拖拽Excel文件到此处
                </p>
                <p className="text-xs text-gray-500">
                  支持 .xlsx 和 .xls 格式
                </p>
              </div>
            )}
          </div>

          {/* 导入结果 */}
          {uploadResult && (
            <div className="mt-4">
              {uploadResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <h3 className="font-medium text-green-800">导入成功</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">总记录数：</span>
                      <span className="font-medium">{uploadResult.data.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">成功导入：</span>
                      <span className="font-medium text-green-600">{uploadResult.data.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">失败数量：</span>
                      <span className="font-medium text-red-600">{uploadResult.data.failed}</span>
                    </div>
                    
                    {uploadResult.data.duplicates && uploadResult.data.duplicates.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm font-medium text-yellow-700 mb-1">跳过的重复客户：</p>
                        <ul className="list-disc list-inside text-xs text-yellow-600">
                          {uploadResult.data.duplicates.map((name: string, index: number) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm font-medium text-red-700 mb-1">错误详情：</p>
                        <ul className="list-disc list-inside text-xs text-red-600">
                          {uploadResult.data.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => router.push('/customers')}
                      size="sm"
                      icon={<CheckCircle size={14} />}
                    >
                      查看客户列表
                    </Button>
                    <Button
                      onClick={() => {
                        setUploadResult(null);
                        document.getElementById('file-input')?.click();
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      继续导入
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={20} className="text-red-600" />
                    <h3 className="font-medium text-red-800">导入失败</h3>
                  </div>
                  <p className="text-sm text-red-700">{uploadResult.error}</p>
                  <Button
                    onClick={() => setUploadResult(null)}
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    icon={<X size={14} />}
                  >
                    关闭
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
