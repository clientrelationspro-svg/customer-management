'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Trash2, Settings as SettingsIcon, Crown, AlertCircle, LogOut, BookOpen, Plus, Edit3, Save, X, Mail, RefreshCw, Check, Eye, EyeOff, Info, ExternalLink, UserCog, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buildEmailHtml } from '@/lib/email/email-template';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  businessRole?: string;
  description?: string;
  company?: string;
  contact?: string;
  createdAt: string;
}

export default function SettingsPage() {
  return <Suspense fallback={<div className="text-center py-8">加载中...</div>}><SettingsContent /></Suspense>;
}

function SettingsContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'user', description: '', company: '', contact: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user', description: '', company: '', contact: '', password: '' });

  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'users' | 'email' | 'skills'>('users');
  const tabs = [
    { key: 'users' as const, label: '用户管理', icon: <UserCog className="w-4 h-4" /> },
    { key: 'email' as const, label: '邮箱配置', icon: <Mail className="w-4 h-4" /> },
    { key: 'skills' as const, label: '员工技能', icon: <Wrench className="w-4 h-4" /> },
  ];

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        if (data.data.role === 'admin') loadUsers();
      }
    } catch { setError('加载用户信息失败'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {}
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) { setError('邮箱和密码为必填'); return; }
    setAdding(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`用户 ${data.data.email} 创建成功`);
        setNewUser({ email: '', name: '', password: '', role: 'user', description: '', company: '', contact: '' });
        setShowAddUser(false);
        loadUsers();
      } else {
        setError(data.error || '创建失败');
      }
    } catch { setError('网络错误'); }
    finally { setAdding(false); }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({ name: user.name || '', email: user.email, role: user.role, description: user.description || '', company: user.company || '', contact: user.contact || '', password: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingUserId || !editForm.email) return;
    try {
      const body: any = { name: editForm.name, email: editForm.email, role: editForm.role, description: editForm.description, company: editForm.company, contact: editForm.contact };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/users/${editingUserId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setSuccess('用户信息已更新'); setEditingUserId(null); loadUsers(); }
      else { setError(data.error || '更新失败'); }
    } catch { setError('网络错误'); }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定删除用户 "${user.name || user.email}" 吗？`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess(`用户已删除`);
        loadUsers();
      } else {
        setError(data.error || '删除失败');
      }
    } catch { setError('删除失败'); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // 员工技能
  interface Skill { id: string; name: string; category: string; workflow: string; goals: string; tips?: string; tools?: string; isActive: boolean; }
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState({ name: '', category: 'communication', workflow: '', goals: '', tips: '', tools: '' });

  useEffect(() => { if (currentUser) loadSkills(); }, [currentUser]);

  const loadSkills = async () => {
    try { const r = await fetch('/api/user-skills'); const d = await r.json(); if (d.success) setSkills(d.data); } catch {}
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name || !skillForm.workflow || !skillForm.goals) return;
    try {
      if (editingSkillId) {
        await fetch(`/api/user-skills/${editingSkillId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skillForm) });
      } else {
        await fetch('/api/user-skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skillForm) });
      }
      setSkillForm({ name: '', category: 'communication', workflow: '', goals: '', tips: '', tools: '' });
      setEditingSkillId(null); setShowAddSkill(false); loadSkills();
    } catch {}
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('删除此技能？')) return;
    await fetch(`/api/user-skills/${id}`, { method: 'DELETE' });
    loadSkills();
  };

  const startEditSkill = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setSkillForm({ name: skill.name, category: skill.category, workflow: skill.workflow, goals: skill.goals, tips: skill.tips || '', tools: skill.tools || '' });
    setShowAddSkill(true);
  };

  const catLabels: Record<string, string> = { communication: '沟通话术', sales: '销售技巧', support: '客户服务', technical: '技术专业' };

  // ========== 邮箱配置 ==========
  interface EmailConfigItem {
    id: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPass: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromName: string;
    isActive: boolean;
    lastSyncAt?: string;
  }
  const [emailConfigs, setEmailConfigs] = useState<EmailConfigItem[]>([]);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showGmailGuide, setShowGmailGuide] = useState(false);
  const [showImapPass, setShowImapPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [emailForm, setEmailForm] = useState({
    imapHost: '', imapPort: '993', imapUser: '', imapPass: '',
    smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '',
    fromName: '',
  });
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => { if (currentUser) loadEmailConfigs(); }, [currentUser]);

  const loadEmailConfigs = async () => {
    try { const r = await fetch('/api/email-config'); const d = await r.json(); if (d.success) setEmailConfigs(d.data); } catch {}
  };

  const fillGmailPreset = () => {
    setEmailForm(p => ({
      ...p,
      imapHost: 'imap.gmail.com', imapPort: '993',
      smtpHost: 'smtp.gmail.com', smtpPort: '465',
    }));
  };

  const handleSaveEmailConfig = async () => {
    const f = emailForm;
    if (!f.imapHost || !f.imapUser || !f.imapPass || !f.smtpHost || !f.smtpUser || !f.smtpPass) {
      setError('请填写所有必填项（IMAP服务器/邮箱/密码 和 SMTP服务器/邮箱/密码 都需要填写）'); return;
    }
    setEmailSaving(true); setError(''); setSuccess('');
    try {
      const body = {
        imapHost: f.imapHost, imapPort: parseInt(f.imapPort) || 993, imapUser: f.imapUser, imapPass: f.imapPass,
        smtpHost: f.smtpHost, smtpPort: parseInt(f.smtpPort) || 465, smtpUser: f.smtpUser, smtpPass: f.smtpPass,
        fromName: f.fromName || f.imapUser,
      };

      let res;
      if (editingEmailId) {
        res = await fetch(`/api/email-config/${editingEmailId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/email-config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(`❌ ${data.error || data.message || '操作失败 (HTTP ' + res.status + ')'}`);
        return;
      }

      setSuccess(editingEmailId ? '邮箱配置已更新' : '✅ 邮箱配置已添加！');
      setEditingEmailId(null);
      setShowAddEmail(false);
      loadEmailConfigs();
      setEmailForm({ imapHost: '', imapPort: '993', imapUser: '', imapPass: '', smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '', fromName: '' });
    } catch (e: any) { 
      setError('网络错误: ' + (e?.message || '请检查服务是否正常运行')); 
    }
    finally { setEmailSaving(false); }
  };

  const handleDeleteEmailConfig = async (id: string) => {
    if (!confirm('确定删除此邮箱配置吗？')) return;
    try {
      const res = await fetch(`/api/email-config/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { setSuccess('邮箱配置已删除'); loadEmailConfigs(); }
      else setError(data.error || '删除失败');
    } catch { setError('删除失败'); }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.imapUser,
          subject: '🔧 客户管理系统 - 邮箱配置测试',
          body: buildEmailHtml(`## ✅ 邮箱配置成功！

如果你收到这封邮件，说明你的 **SMTP 配置** 是正确的。

**发件人:** ${emailForm.fromName || emailForm.imapUser}

---

> 此邮件由客户管理系统自动发送
`, '邮箱配置测试'),
          config: {
            host: emailForm.smtpHost, port: parseInt(emailForm.smtpPort),
            user: emailForm.smtpUser, pass: emailForm.smtpPass,
            fromName: emailForm.fromName || emailForm.imapUser,
          },
        }),
      });
      const data = await res.json();
      if (data.success) setSuccess('✅ 测试邮件发送成功！请检查收件箱');
      else setError(data.error || '发送失败，请检查 SMTP 配置');
    } catch { setError('发送失败'); }
    finally { setTestingEmail(false); }
  };

  const handleEditEmailConfig = (config: EmailConfigItem) => {
    setEditingEmailId(config.id);
    setEmailForm({
      imapHost: config.imapHost, imapPort: String(config.imapPort), imapUser: config.imapUser, imapPass: config.imapPass,
      smtpHost: config.smtpHost, smtpPort: String(config.smtpPort), smtpUser: config.smtpUser, smtpPass: config.smtpPass,
      fromName: config.fromName || '',
    });
    setShowAddEmail(true);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-gray-600" />
          系统设置
        </h1>
        <p className="text-sm text-gray-500 mt-1">管理系统用户、邮箱和技能 · <span className="text-green-600 font-medium">v2.2</span></p>
      </div>

      {/* 标签导航 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 全局提示信息 */}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

      {/* 当前用户信息 */}
      {activeTab === 'users' && (<>
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">
                {(currentUser?.name || currentUser?.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{currentUser?.name || currentUser?.email}</p>
              <p className="text-sm text-gray-500">{currentUser?.email} · 
                <span className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isAdmin ? <><Crown className="w-3 h-3" /> 管理员</> : '普通用户'}
                </span>
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> 退出登录
          </Button>
        </div>
      </Card>

      {/* 业务角色选择 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-medium text-gray-900 text-sm">业务角色</h3>
            <p className="text-xs text-gray-500 mt-0.5">选择你在贸易中的角色，系统将调整开发策略和阶段看板</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentUser?.businessRole || 'supplier'}
              onChange={async (e) => {
                const role = e.target.value;
                try {
                  await fetch('/api/auth/me/update', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ businessRole: role }),
                  });
                  loadCurrentUser();
                  setSuccess('业务角色已更新');
                  setTimeout(() => setSuccess(''), 2000);
                } catch { setError('更新失败'); }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="supplier">🏭 供应商</option>
              <option value="buyer">🛒 采购商</option>
              <option value="middleman">🤝 中间商</option>
            </select>
          </div>
        </div>
        {currentUser?.businessRole && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            当前模式：
            {currentUser.businessRole === 'supplier' && '供应商 — 阶段看板：初步接触→报价谈判→样品寄送→合作成单'}
            {currentUser.businessRole === 'buyer' && '采购商 — 阶段看板：供应商筛选→询价对比→样品检验→签约供货'}
            {currentUser.businessRole === 'middleman' && '中间商 — 阶段看板：需求匹配→双方介绍→撮合洽谈→成交跟单'}
          </div>
        )}
      </Card>

      {/* 用户管理（仅管理员可见） */}
      {isAdmin ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              用户管理
              <span className="text-sm text-gray-400">({users.length}人)</span>
            </h2>
            <Button onClick={() => setShowAddUser(!showAddUser)} size="sm" variant={showAddUser ? 'secondary' : 'primary'}>
              <UserPlus className="w-4 h-4 mr-1" /> {showAddUser ? '取消' : '添加用户'}
            </Button>
          </div>

          {/* 添加用户表单 */}
          {showAddUser && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  placeholder="邮箱 *" type="email" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  placeholder="姓名（可选）" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  placeholder="密码 *" type="password" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
                <input value={newUser.description} onChange={e => setNewUser(p => ({ ...p, description: e.target.value }))}
                  placeholder="业务描述（如：专注欧美机械设备外贸）" className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
                <input value={newUser.company} onChange={e => setNewUser(p => ({ ...p, company: e.target.value }))}
                  placeholder="公司简介" className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
                <input value={newUser.contact} onChange={e => setNewUser(p => ({ ...p, contact: e.target.value }))}
                  placeholder="联系方式（电话/微信/WhatsApp）" className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
              </div>
              <Button onClick={handleAddUser} loading={adding} size="sm" className="mt-3">
                <UserPlus className="w-4 h-4 mr-1" /> 创建用户
              </Button>
            </div>
          )}

          {/* 用户列表 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">用户</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">角色</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 hidden md:table-cell">业务描述</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 hidden lg:table-cell">公司</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 hidden lg:table-cell">联系方式</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 hidden sm:table-cell">创建</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  if (editingUserId === user.id) {
                    return (
                    <tr key={user.id} className="border-b border-blue-100 bg-blue-50/30">
                      <td className="py-2 px-3" colSpan={5}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="姓名" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="邮箱" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                          <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="业务描述" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))}
                            placeholder="公司简介" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <input value={editForm.contact} onChange={e => setEditForm(p => ({ ...p, contact: e.target.value }))}
                            placeholder="联系方式" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <input value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                            placeholder="新密码（留空不修改）" type="password" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <div className="flex gap-1">
                            <Button onClick={handleSaveEdit} size="sm"><Save className="w-3 h-3 mr-1" />保存</Button>
                            <Button variant="secondary" size="sm" onClick={() => setEditingUserId(null)}><X className="w-3 h-3 mr-1" />取消</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  }
                  return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.email}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role === 'admin' ? <><Crown className="w-3 h-3" /> 管理员</> : '用户'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 hidden md:table-cell max-w-[150px] truncate">
                      {user.description || '-'}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 hidden lg:table-cell max-w-[120px] truncate">
                      {user.company || '-'}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 hidden lg:table-cell max-w-[120px] truncate">
                      {user.contact || '-'}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 hidden sm:table-cell">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => handleEditUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button onClick={() => handleDeleteUser(user)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="删除用户">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">暂无用户</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-8 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">普通用户模式</p>
            <p className="text-xs mt-1">仅管理员可管理用户</p>
          </div>
        </Card>
      )}
      </>
      )}

      {/* ===== 员工技能标签页 ===== */}
      {activeTab === 'skills' && (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            员工技能
            <span className="text-sm text-gray-400">({skills.length}项)</span>
          </h2>
          <Button onClick={() => { setShowAddSkill(!showAddSkill); setEditingSkillId(null); setSkillForm({ name: '', category: 'communication', workflow: '', goals: '', tips: '', tools: '' }); }} size="sm" variant={showAddSkill ? 'secondary' : 'primary'}>
            <Plus className="w-4 h-4 mr-1" /> {showAddSkill ? '取消' : '添加技能'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mb-4">定义你的工作技能，帮助AI更精准地生成符合你工作风格的话术和方案</p>

        {/* 添加/编辑表单 */}
        {showAddSkill && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={skillForm.name} onChange={e => setSkillForm(p => ({ ...p, name: e.target.value }))}
                placeholder="技能名称 *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={skillForm.category} onChange={e => setSkillForm(p => ({ ...p, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="communication">沟通话术</option>
                <option value="sales">销售技巧</option>
                <option value="support">客户服务</option>
                <option value="technical">技术专业</option>
              </select>
              <textarea value={skillForm.workflow} onChange={e => setSkillForm(p => ({ ...p, workflow: e.target.value }))}
                rows={3} placeholder="工作流程 * — 描述你日常工作的步骤和节奏，如：每天早上检查WhatsApp消息→筛选潜在客户→发送个性化问候→开发48小时内未回复的客户"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
              <textarea value={skillForm.goals} onChange={e => setSkillForm(p => ({ ...p, goals: e.target.value }))}
                rows={2} placeholder="工作目标 * — 如：每月开发20个新客户、回复率达到15%、转化率5%"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
              <input value={skillForm.tips} onChange={e => setSkillForm(p => ({ ...p, tips: e.target.value }))}
                placeholder="经验技巧（可选）— 如：主动提及客户所在行业的痛点效果更好" className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
              <input value={skillForm.tools} onChange={e => setSkillForm(p => ({ ...p, tools: e.target.value }))}
                placeholder="常用工具（可选）— 如：WhatsApp Business, HubSpot, Google Translate" className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2" />
            </div>
            <Button onClick={handleSaveSkill} size="sm">
              <Save className="w-4 h-4 mr-1" /> {editingSkillId ? '更新技能' : '创建技能'}
            </Button>
          </div>
        )}

        {/* 技能列表 */}
        {skills.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无技能，点击"添加技能"开始定义你的工作方法</div>
        ) : (
          <div className="space-y-3">
            {skills.map(skill => (
              <div key={skill.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{skill.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{catLabels[skill.category] || skill.category}</span>
                      {!skill.isActive && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">已停用</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEditSkill(skill)} className="p-1 text-gray-400 hover:text-blue-600" title="编辑"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteSkill(skill.id)} className="p-1 text-gray-400 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium text-gray-500">📋 工作流程：</span>
                    <p className="mt-0.5 leading-relaxed">{skill.workflow.substring(0, 120)}{skill.workflow.length > 120 ? '...' : ''}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">🎯 工作目标：</span>
                    <p className="mt-0.5 leading-relaxed">{skill.goals.substring(0, 120)}{skill.goals.length > 120 ? '...' : ''}</p>
                  </div>
                </div>
                {(skill.tips || skill.tools) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skill.tips && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">💡 {skill.tips.substring(0, 60)}</span>}
                    {skill.tools && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">🛠 {skill.tools.substring(0, 60)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      )}

      {/* ===== 邮箱配置标签页 ===== */}
      {activeTab === 'email' && (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            邮箱配置
            <span className="text-sm text-gray-400">({emailConfigs.length}个)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGmailGuide(!showGmailGuide)}
              className="text-xs text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              Gmail 配置指南
            </button>
            <Button
              onClick={() => { setShowAddEmail(!showAddEmail); setEditingEmailId(null); setEmailForm({ imapHost: '', imapPort: '993', imapUser: '', imapPass: '', smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '', fromName: '' }); }}
              size="sm" variant={showAddEmail ? 'secondary' : 'primary'}
            >
              <Plus className="w-4 h-4 mr-1" /> {showAddEmail ? '取消' : '添加邮箱'}
            </Button>
          </div>
        </div>

        {/* Gmail 配置指南 */}
        {showGmailGuide && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">📧 Gmail 邮箱配置步骤</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>
                <strong>开启两步验证：</strong>
                访问{' '}
                <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
                  Google 安全设置 <ExternalLink className="w-3 h-3" />
                </a>
                ，开启"两步验证"
              </li>
              <li>
                <strong>生成应用专用密码：</strong>
                在 Google 账号 → 安全性 → "应用专用密码"中，选择"邮件"和"其他"，生成一个 <span className="font-mono bg-blue-100 px-1 rounded">16位应用密码</span>
              </li>
              <li>
                <strong>开启 IMAP：</strong>
                在 Gmail 设置 → "转发和 POP/IMAP"中，<strong>启用 IMAP</strong>
              </li>
              <li>
                <strong>填写配置：</strong>
                点击下方 <span className="font-semibold">"填入 Gmail 预设"</span> 按钮，然后填入你的 Gmail 地址和<strong>应用专用密码</strong>（不是登录密码）
              </li>
            </ol>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
              ⚠️ <strong>重要：</strong>Gmail 不支持直接使用登录密码，必须使用<strong>应用专用密码</strong>。如果未开启两步验证，系统将无法连接 Gmail。
            </div>
          </div>
        )}

        {/* 添加/编辑表单 */}
        {showAddEmail && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={fillGmailPreset}
                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                填入 Gmail 预设
              </button>
              <span className="text-xs text-gray-400">（自动填入 imap.gmail.com / smtp.gmail.com）</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* IMAP 收件 */}
              <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">📥 收件服务器 (IMAP)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <input value={emailForm.imapHost} onChange={e => setEmailForm(p => ({ ...p, imapHost: e.target.value }))}
                    placeholder="IMAP 服务器 *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2" />
                  <input value={emailForm.imapPort} onChange={e => setEmailForm(p => ({ ...p, imapPort: e.target.value }))}
                    placeholder="端口" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <input value={emailForm.imapUser} onChange={e => setEmailForm(p => ({ ...p, imapUser: e.target.value, smtpUser: e.target.value, fromName: p.fromName || e.target.value }))}
                  placeholder="邮箱地址 * (如 yourname@gmail.com)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="relative">
                  <input value={emailForm.imapPass} onChange={e => setEmailForm(p => ({ ...p, imapPass: e.target.value, smtpPass: e.target.value }))}
                    type={showImapPass ? 'text' : 'password'} placeholder="IMAP 密码（应用专用密码） *" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm" />
                  <button onClick={() => setShowImapPass(!showImapPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showImapPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SMTP 发件 */}
              <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">📤 发件服务器 (SMTP)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <input value={emailForm.smtpHost} onChange={e => setEmailForm(p => ({ ...p, smtpHost: e.target.value }))}
                    placeholder="SMTP 服务器 *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2" />
                  <input value={emailForm.smtpPort} onChange={e => setEmailForm(p => ({ ...p, smtpPort: e.target.value }))}
                    placeholder="端口" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <input value={emailForm.smtpUser} onChange={e => setEmailForm(p => ({ ...p, smtpUser: e.target.value }))}
                  placeholder="SMTP 用户名（同邮箱地址）" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="relative">
                  <input value={emailForm.smtpPass} onChange={e => setEmailForm(p => ({ ...p, smtpPass: e.target.value }))}
                    type={showSmtpPass ? 'text' : 'password'} placeholder="SMTP 密码 *" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm" />
                  <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <input value={emailForm.fromName} onChange={e => setEmailForm(p => ({ ...p, fromName: e.target.value }))}
              placeholder="发件人显示名称（如：张三 - ABC Company）" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveEmailConfig} loading={emailSaving} size="sm">
                <Save className="w-4 h-4 mr-1" /> {editingEmailId ? '更新配置' : '保存配置'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleTestEmail} loading={testingEmail} disabled={!emailForm.smtpHost || !emailForm.smtpUser || !emailForm.smtpPass}>
                <RefreshCw className="w-4 h-4 mr-1" /> 测试发送
              </Button>
            </div>
          </div>
        )}

        {/* 已配置邮箱列表 */}
        {emailConfigs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            暂无邮箱配置，点击"添加邮箱"绑定你的 Gmail 或其他邮箱
          </div>
        ) : (
          <div className="space-y-2">
            {emailConfigs.map(config => (
              <div key={config.id} className={`p-3 border rounded-lg flex items-center justify-between flex-wrap gap-2 ${config.isActive ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${config.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{config.fromName || config.imapUser}</p>
                      {config.isActive && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-0.5"><Check className="w-3 h-3" /> 活跃</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {config.imapUser} · IMAP {config.imapHost}:{config.imapPort} · SMTP {config.smtpHost}:{config.smtpPort}
                    </p>
                    {config.lastSyncAt && (
                      <p className="text-xs text-gray-400">上次同步: {new Date(config.lastSyncAt).toLocaleString('zh-CN')}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditEmailConfig(config)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteEmailConfig(config.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
