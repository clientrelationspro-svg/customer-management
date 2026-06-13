// 客户端活动记录工具
export async function logActivity(action: string, customerId?: string) {
  try {
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, customerId: customerId || undefined }),
    });
  } catch {}
}
