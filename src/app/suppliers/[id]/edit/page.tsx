'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', country: '', mainProducts: '', cooperationStatus: 'potential',
    riskLevel: '', riskTypes: '', riskDescription: '',
    phone: '', email: '', website: '', address: '',
    foundedDate: '', orderAmount: '', notes: '',
  });

  useEffect(() => {
    if (id) {
      fetch(`/api/suppliers/${id}`).then(r => r.json()).then(data => {
        if (data.success) {
          const s = data.data;
          setForm({
            name: s.name || '', country: s.country || '', mainProducts: s.mainProducts || '',
            cooperationStatus: s.cooperationStatus || 'potential',
            riskLevel: s.riskLevel || '', riskTypes: s.riskTypes || '', riskDescription: s.riskDescription || '',
            phone: s.phone || '', email: s.email || '', website: s.website || '', address: s.address || '',
            foundedDate: s.foundedDate ? new Date(s.foundedDate).toISOString().split('T')[0] : '',
            orderAmount: s.orderAmount != null ? String(s.orderAmount) : '', notes: s.notes || '',
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('公司名称不能为空');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return alert('邮箱格式不正确');
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) { alert('供应商更新成功'); router.push(`/suppliers/${id}`); }
      else { const err = await res.json(); alert(err.error || '更新失败'); }
    } catch { alert('更新失败'); }
    finally { setSaving(false); }
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">编辑供应商</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="公司名称" required><input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="form-input" /></Field>
            <Field label="国家"><input type="text" value={form.country} onChange={e => update('country', e.target.value)} className="form-input" /></Field>
            <Field label="主要产品"><input type="text" value={form.mainProducts} onChange={e => update('mainProducts', e.target.value)} className="form-input" /></Field>
            <Field label="合作状态">
              <select value={form.cooperationStatus} onChange={e => update('cooperationStatus', e.target.value)} className="form-input">
                <option value="potential">潜在</option><option value="active">合作中</option><option value="suspended">暂停</option><option value="terminated">终止</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">联系方式</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="电话"><input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} className="form-input" /></Field>
            <Field label="邮箱"><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="form-input" /></Field>
            <Field label="网站"><input type="text" value={form.website} onChange={e => update('website', e.target.value)} className="form-input" /></Field>
            <Field label="地址"><input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="form-input" /></Field>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">风险评估</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="风险等级">
              <select value={form.riskLevel} onChange={e => update('riskLevel', e.target.value)} className="form-input">
                <option value="">未设置</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option>
              </select>
            </Field>
            <Field label="风险类型"><input type="text" value={form.riskTypes} onChange={e => update('riskTypes', e.target.value)} className="form-input" /></Field>
            <Field label="风险描述" span><textarea value={form.riskDescription} onChange={e => update('riskDescription', e.target.value)} rows={2} className="form-input" /></Field>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">其他信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="成立日期"><input type="date" value={form.foundedDate} onChange={e => update('foundedDate', e.target.value)} className="form-input" /></Field>
            <Field label="订单金额"><input type="number" value={form.orderAmount} onChange={e => update('orderAmount', e.target.value)} className="form-input" /></Field>
            <Field label="备注" span><textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} className="form-input" /></Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={saving}><Save className="w-4 h-4 mr-1" />{saving ? '保存中...' : '保存更改'}</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>取消</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required, span }: { label: string; children: React.ReactNode; required?: boolean; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}
