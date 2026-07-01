# 云端部署 + 每周备份指南

## 一、配置 Vercel PostgreSQL

### 步骤 1：创建数据库
1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 → **Storage** 标签
3. 点击 **Create Database** → 选择 **Postgres**
4. 创建后自动注入环境变量：
   - `POSTGRES_URL` — 完整连接字符串
   - `POSTGRES_PRISMA_URL` — Prisma 专用连接
   - `POSTGRES_URL_NON_POOLING` — 非池化连接（推荐用于 Prisma）

5. 在项目 **Settings → Environment Variables** 确认 `DATABASE_URL` 已设置

### 步骤 2：初始化数据库
```bash
# Vercel 部署时会自动执行 build.sh：
# 1. 切换 provider 为 postgresql
# 2. npx prisma generate
# 3. npx next build
```

首次部署后，需要在 Vercel 上运行迁移：
```bash
# 本地连接 Vercel
npx vercel link
npx vercel env pull .env.vercel

# 运行迁移
DATABASE_URL=$(grep DATABASE_URL .env.vercel | cut -d'=' -f2) npx prisma db push
```

## 二、每周自动备份

### 手动备份
```bash
# 从 Vercel 获取 DATABASE_URL 后
POSTGRES_URL="postgresql://..." npm run backup
```

备份文件保存位置：
- `backups/dev_YYYYMMDD_HHMMSS.db` — 本地数据库快照
- `backups/data_YYYYMMDD_HHMMSS/` — JSON 格式导出的每条记录

### 设置自动备份（macOS）
编辑 crontab：
```bash
crontab -e
```

添加以下行（每周日凌晨 3 点执行）：
```
0 3 * * 0 POSTGRES_URL="postgresql://..." bash /Users/mima0000/CodeBuddy/客户管理系统/scripts/backup.sh >> /Users/mima0000/CodeBuddy/客户管理系统/backups/backup.log 2>&1
```

> ⚠️ 把 `postgresql://...` 替换为你的实际 Vercel PostgreSQL URL

## 三、恢复备份
需要恢复时，复制备份文件到 prisma 目录：
```bash
cp backups/dev_YYYYMMDD_HHMMSS.db prisma/dev.db
```

## 四、数据库架构
```
┌─────────────────┐     每次部署自动     ┌─────────────────┐
│  本地 SQLite    │ ←────────────────── │ Vercel PostgreSQL │
│  prisma/dev.db  │    每周备份同步      │  (云端主库)       │
└─────────────────┘                     └─────────────────┘
```
