import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 格式化日期
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 格式化货币
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(num)
}

// 生成订单号
export function generateOrderNo(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `ORD${year}${month}${day}${random}`
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 验证文件类型
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return allowedTypes.includes(`.${ext}`)
}

// 生成 SKU
export function generateSKU(prefix: string = 'PRD'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// 状态映射
export const statusMap: Record<string, { label: string; color: string }> = {
  // 客户/供应商/产品状态
  active: { label: '活跃', color: 'bg-green-100 text-green-800' },
  inactive: { label: '停用', color: 'bg-gray-100 text-gray-800' },
  
  // 订单状态
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '已发货', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: '已送达', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
  
  // 支付状态
  unpaid: { label: '未付款', color: 'bg-red-100 text-red-800' },
  partial: { label: '部分付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
}

export function getStatusBadge(status: string) {
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
}

// 检查是否逾期
export function isOverdue(date: Date | string): boolean {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return targetDate < today;
}

// 计算逾期天数
export function getOverdueDays(date: Date | string): number {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - targetDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
