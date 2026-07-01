#!/bin/bash
# ==========================================
# 云端 PostgreSQL → 本地 SQLite 备份脚本
# 用法: 
#   chmod +x scripts/backup.sh
#   POSTGRES_URL="postgresql://..." ./scripts/backup.sh
# ==========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$PROJECT_DIR"

if [ -z "${POSTGRES_URL}" ]; then
  echo "❌ 请设置 POSTGRES_URL 环境变量"
  echo "   POSTGRES_URL='postgresql://user:pass@host:5432/db' ./scripts/backup.sh"
  exit 1
fi

echo "📦 云端 PostgreSQL → 本地 SQLite 备份"
echo "   时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. 备份当前本地数据库
mkdir -p "$BACKUP_DIR"
if [ -f "$PROJECT_DIR/prisma/dev.db" ]; then
  cp "$PROJECT_DIR/prisma/dev.db" "$BACKUP_DIR/dev_${TIMESTAMP}.db"
  echo "✅ 本地数据库已备份: $BACKUP_DIR/dev_${TIMESTAMP}.db"
fi

# 2. 使用 Node.js 导出云端数据
echo "📥 正在从云端导出数据..."
DATABASE_URL="$POSTGRES_URL" node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function exportData() {
  const prisma = new PrismaClient();
  await prisma.\$connect();
  
  const tables = [
    { model: 'user', name: 'users' },
    { model: 'customer', name: 'customers' },
    { model: 'contact', name: 'contacts' },
    { model: 'supplier', name: 'suppliers' },
    { model: 'supplierContact', name: 'supplier_contacts' },
    { model: 'product', name: 'products' },
    { model: 'order', name: 'orders' },
    { model: 'orderItem', name: 'order_items' },
    { model: 'file', name: 'files' },
    { model: 'followUp', name: 'follow_ups' },
    { model: 'followUpScript', name: 'follow_up_scripts' },
    { model: 'emailConfig', name: 'email_configs' },
    { model: 'inquiry', name: 'inquiries' },
    { model: 'inquiryReply', name: 'inquiry_replies' },
    { model: 'scheduledFollowUp', name: 'scheduled_follow_ups' },
    { model: 'developmentPlan', name: 'development_plans' },
    { model: 'customerNeed', name: 'customer_needs' },
    { model: 'activityLog', name: 'activity_logs' },
    { model: 'userSkill', name: 'user_skills' },
    { model: 'supplierCommunication', name: 'supplier_communications' },
    { model: 'supplierRiskEvent', name: 'supplier_risk_events' },
  ];

  const dir = '$BACKUP_DIR/data_$TIMESTAMP';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let total = 0;
  for (const t of tables) {
    try {
      const rows = await prisma[t.model].findMany();
      if (rows.length > 0) {
        const cleanRows = rows.map(r => {
          const obj = {};
          for (const [k, v] of Object.entries(r)) {
            if (k.startsWith('_')) continue;
            obj[k] = v instanceof Date ? v.toISOString() : v;
          }
          return obj;
        });
        fs.writeFileSync(path.join(dir, t.name + '.json'), JSON.stringify(cleanRows, null, 2));
        total += cleanRows.length;
        console.log('  ✅ ' + t.model + ': ' + cleanRows.length + ' 条');
      }
    } catch(e) {}
  }

  console.log('');
  console.log('✅ 导出完成: ' + total + ' 条记录');
  await prisma.\$disconnect();
}
exportData().catch(e => { console.error(e); process.exit(1); });
" 2>&1

# 3. 清理旧备份（保留最近4份）
BACKUP_COUNT=$(ls "$BACKUP_DIR"/dev_*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 4 ]; then
  ls -t "$BACKUP_DIR"/dev_*.db | tail -n +5 | xargs rm -f
  echo "🧹 已清理 $(($BACKUP_COUNT - 4)) 个旧备份"
fi

echo ""
echo "✅ 备份完成! 数据保存在: $BACKUP_DIR/data_$TIMESTAMP/"
echo "   本地数据库: $PROJECT_DIR/prisma/dev.db"
echo "   历史备份: $BACKUP_DIR/"
