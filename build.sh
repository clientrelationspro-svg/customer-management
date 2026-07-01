#!/bin/bash
set -e

# Vercel 部署：排除 mcp-server（WorkBuddy 本地模块）
rm -rf mcp-server 2>/dev/null || true

# 切换到 PostgreSQL（仅 Vercel 环境）
if [ -n "${VERCEL}" ] || [ -n "${POSTGRES_URL}" ]; then
  perl -i -pe 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  npx prisma generate
  node prisma/setup-inquiries.js
  npx next build
  # 恢复 sqlite 供本地使用
  perl -i -pe 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
else
  # 本地开发构建
  npx prisma generate
  npx next build
fi
