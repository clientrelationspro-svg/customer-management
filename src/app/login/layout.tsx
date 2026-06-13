export const metadata = { title: '登录 - 客户管理系统' };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // 登录页不使用主布局（无侧边栏/导航栏）
  return children;
}
