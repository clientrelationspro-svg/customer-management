# 客户管理系统

全套客户管理、跟进、话术系统（Next.js 14 + Prisma + Tailwind CSS）

## 部署到 Vercel（免费托管 + 自动域名）

### 步骤 1：推送到 GitHub
在 GitHub 创建新仓库，然后执行：
```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git commit -m "initial commit"
git push -u origin main
```

### 步骤 2：连接 Vercel
1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点击 **New Project** → 导入你的仓库
3. 框架自动识别为 Next.js

### 步骤 3：设置数据库
⚠️ SQLite 不支持 Vercel，需切换到 PostgreSQL：

1. 在 Vercel Dashboard → Storage → 创建 **Vercel Postgres**（免费 256MB）
2. 创建后自动注入环境变量，或手动添加：
   ```
   DATABASE_URL = postgres://...
   ```

3. 修改 `prisma/schema.prisma`，将：
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   改为：
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

4. 修改 `next.config.js`，将 `output: 'standalone'` 移除（Vercel 自动处理）

### 步骤 4：部署
- 点击 **Deploy**
- 自动获得域名：`你的项目名.vercel.app`

### 本地开发
```bash
npm install
cp .env.example .env  # 编辑 DATABASE_URL
npx prisma db push     # 创建数据库表
npm run dev            # 启动 http://localhost:3000
```

## 功能模块
- 客户管理（公司信息 + 联系人）
- 客户跟进（多状态、优先级、逾期提醒）
- 跟进话术（WhatsApp/邮件/电话 一键发送）
- AI 模板导入导出
- 侧边栏显隐控制
