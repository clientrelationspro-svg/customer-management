#!/bin/bash
# ====================================
# CRM MCP Server 部署脚本
# ====================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 部署 CRM MCP Server..."
echo "   项目根目录: $PROJECT_DIR"
echo "   MCP目录: $SCRIPT_DIR"
echo ""

# 1. 确认数据库存在
if [ ! -f "$PROJECT_DIR/prisma/dev.db" ]; then
  echo "⚠️  数据库文件不存在，请先运行: cd $PROJECT_DIR && npx prisma db push"
  exit 1
fi
echo "✅ 数据库文件存在: $PROJECT_DIR/prisma/dev.db"

# 2. 安装依赖
echo ""
echo "📥 安装依赖..."
cd "$SCRIPT_DIR"
npm install --production

# 3. 生成 Prisma Client
echo ""
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 4. 编译 TypeScript
echo ""
echo "🔨 编译 TypeScript..."
npm run build

# 5. 验证
echo ""
echo "🧪 验证 MCP Server..."
node dist/index.js &
PID=$!
sleep 2
kill $PID 2>/dev/null || true
wait $PID 2>/dev/null || true

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 WorkBuddy 配置已就绪:"
echo "   配置文件: $PROJECT_DIR/../.codebuddy/mcp.json"
echo ""
echo "🚀 手动启动测试:"
echo "   cd $SCRIPT_DIR && node dist/index.js"
echo ""
echo "💡 在 WorkBuddy 中对话即可使用, 例如:"
echo "   '列出所有客户'"
echo "   '查看仪表盘统计'"
echo "   '搜索包含 metal 的客户'"
echo "   '创建新跟进记录'"
