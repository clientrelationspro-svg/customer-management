#!/bin/bash
set -e

# Vercel 部署：排除 mcp-server（WorkBuddy 本地模块，不需要在 Vercel 编译）
rm -rf mcp-server 2>/dev/null || true

# 切换到 PostgreSQL
perl -i -pe 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
npx prisma generate
node prisma/setup-inquiries.js
npx next build
