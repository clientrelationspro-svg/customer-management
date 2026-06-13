'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Trash2, Settings as SettingsIcon, Crown, AlertCircle, LogOut, BookOpen, Plus, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
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

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-gray-600" />
          系统设置
        </h1>
        <p className="text-sm text-gray-500 mt-1">管理系统用户和权限</p>
      </div>

      {/* 当前用户信息 */}
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

      {/* 提示信息 */}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

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

      {/* 员工技能 */}
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
                rows={3} placeholder="工作流程 * — 描述你日常工作的步骤和节奏，如：每天早上检查WhatsApp消息→筛选潜在客户→发送个性化问候→跟进48小时内未回复的客户"
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
    </div>
  );
}
