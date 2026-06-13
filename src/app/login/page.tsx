'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, LogIn, X, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'cm_saved_emails';

function getSavedEmails(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveEmail(email: string) {
  const emails = getSavedEmails().filter(e => e !== email);
  emails.unshift(email);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails.slice(0, 5)));
}

function clearEmails() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setSavedEmails(getSavedEmails());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        saveEmail(email.trim());
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const selectSaved = (savedEmail: string) => {
    setEmail(savedEmail);
    setShowSaved(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理系统</h1>
          <p className="text-sm text-gray-500 mt-1">请登录您的账户</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => savedEmails.length > 0 && setShowSaved(true)}
                onBlur={() => setTimeout(() => setShowSaved(false), 200)}
                placeholder="admin@example.com"
                autoFocus
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {savedEmails.length > 0 && (
                <button type="button" onClick={() => setShowSaved(!showSaved)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSaved ? 'rotate-180' : ''}`} />
                </button>
              )}
              {/* 已保存账号下拉 */}
              {showSaved && savedEmails.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {savedEmails.map((s, i) => (
                    <button key={i} type="button" onClick={() => selectSaved(s)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      {s}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button type="button" onClick={() => { clearEmails(); setSavedEmails([]); setShowSaved(false); }}
                      className="w-full px-4 py-1.5 text-left text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" /> 清除记录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <Button type="submit" loading={loading} className="w-full py-3 text-base">
            <LogIn className="w-5 h-5 mr-2" />
            登录
          </Button>

          <p className="text-xs text-center text-gray-400">
            默认管理员：admin@example.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
