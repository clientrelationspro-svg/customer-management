'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Upload, 
  Trash2, 
  FileText, 
  Download,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatFileSize, formatDate } from '@/lib/utils';

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

function FilesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityType = searchParams.get('entityType') || '';
  const entityId = searchParams.get('entityId') || '';
  
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadEntityType, setUploadEntityType] = useState(entityType || 'customer');
  const [uploadEntityId, setUploadEntityId] = useState(entityId || '');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType && entityId) {
        params.set('entityType', entityType);
        params.set('entityId', entityId);
      }
      
      const res = await fetch(`/api/files?${params}`);
      const data = await res.json();
      
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadEntityType || !uploadEntityId) {
      alert('请填写完整信息');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('entityType', uploadEntityType);
    formData.append('entityId', uploadEntityId);
    formData.append('uploadedBy', 'admin');

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        fetchFiles();
      } else {
        const error = await res.json();
        alert(error.error || '上传失败');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上传失败');
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    
    try {
      const res = await fetch(`/api/files/${selectedFile.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchFiles();
        setIsDeleteModalOpen(false);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const filteredFiles = files.filter(file => 
    file.originalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">文件管理</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-5 h-5 mr-2" />
          上传文件
        </Button>
      </div>

      {/* 搜索 */}
      <Card className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索文件名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* 文件列表 */}
      <Card>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无文件</div>
        ) : (
          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{file.originalName}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{file.entityType}</span>
                      <span>•</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="下载"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(file);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 上传文件模态框 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">上传文件</h2>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文件 <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  实体类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadEntityType}
                  onChange={(e) => setUploadEntityType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="customer">客户</option>
                  <option value="supplier">供应商</option>
                  <option value="order">订单</option>
                  <option value="product">产品</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  实体ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadEntityId}
                  onChange={(e) => setUploadEntityId(e.target.value)}
                  placeholder="请输入实体ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">已选择文件:</p>
                  <p className="font-medium text-gray-900">{uploadFile.name}</p>
                  <p className="text-sm text-gray-600">
                    大小: {formatFileSize(uploadFile.size)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadEntityType || !uploadEntityId}
              >
                <Upload className="w-5 h-5 mr-2" />
                上传
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedFile(null);
        }}
        onConfirm={handleDelete}
        title="删除文件"
        message={`确定要删除文件 "${selectedFile?.originalName}" 吗？此操作不可撤销。`}
        danger
      />
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <FilesPageContent />
    </Suspense>
  );
}
