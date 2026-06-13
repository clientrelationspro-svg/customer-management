'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, User, LogOut, PanelLeftClose, Settings, Crown } from 'lucide-react';

interface UserInfo {
  name?: string;
  email: string;
  role: string;
  description?: string;
}

interface NavbarProps {
  onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.data); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSettings = () => {
    setIsProfileOpen(false);
    router.push('/settings');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="切换侧边栏"
          >
            <PanelLeftClose className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">客户管理系统</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* 快捷按钮 */}
          <button
            onClick={handleSettings}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
            title="系统设置"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>

          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.name || user?.email || '?')[0].toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.name || user?.email || '用户'}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {/* 用户信息 */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name || '用户'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {user?.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{user.description}</p>
                    )}
                    {user?.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                        <Crown className="w-3 h-3" /> 管理员
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSettings}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    系统设置
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
