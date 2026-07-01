/**
 * 云端 PostgreSQL → 本地 SQLite 备份脚本
 * 
 * 用法: 
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backup-cloud-to-local.ts
 * 
 * 或在 package.json 中：
 *   "backup": "DATABASE_URL=你的云端URL npx tsx scripts/backup-cloud-to-local.ts"
 */

import { PrismaClient as PgClient } from '@prisma/client';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const LOCAL_DB = path.resolve(__dirname, '..', 'prisma', 'dev.db');
const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

interface BackupResult {
  table: string;
  count: number;
  status: 'ok' | 'error';
}

async function backup() {
  console.log('📦 云端 → 本地备份开始...\n');

  // 1. 连接云端 PostgreSQL
  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!pgUrl || !pgUrl.startsWith('postgres')) {
    console.error('❌ 需要设置 DATABASE_URL 为 PostgreSQL 连接字符串');
    console.error('   示例: DATABASE_URL="postgresql://user:pass@host:5432/db" npx tsx scripts/backup-cloud-to-local.ts');
    process.exit(1);
  }

  const pg = new PgClient({ datasources: { db: { url: pgUrl } } });
  await pg.$connect();
  console.log('✅ 已连接云端 PostgreSQL');

  // 2. 创建备份目录
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // 3. 备份当前本地数据库
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
  if (fs.existsSync(LOCAL_DB)) {
    fs.copyFileSync(LOCAL_DB, backupPath);
    console.log(`📁 本地备份已保存: ${backupPath}`);
  }

  // 4. 创建新的本地 SQLite
  const sqlite = new Database(LOCAL_DB);
  
  // 启用 WAL 模式提升性能
  sqlite.pragma('journal_mode = WAL');

  const results: BackupResult[] = [];

  // 5. 逐表同步
  const tables = [
    'user', 'customer', 'contact', 'supplier', 'supplierContact', 
    'supplierCommunication', 'supplierRiskEvent', 'product', 'order', 'orderItem',
    'file', 'activityLog', 'userSkill', 'emailConfig', 'inquiry',
    'inquiryReply', 'scheduledFollowUp', 'followUp', 'followUpScript',
    'customerNeed', 'developmentPlan'
  ];

  for (const table of tables) {
    try {
      // 从 Postgres 读取
      const rows = await (pg as any)[table].findMany();
      
      if (rows.length === 0) {
        console.log(`  ${table}: 0 条 (跳过)`);
        continue;
      }

      // 清空本地表
      sqlite.exec(`DELETE FROM "${mapTableName(table)}"`);

      // 写入本地 SQLite
      const dbTable = mapTableName(table);
      const columns = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
      
      const insertStmt = sqlite.prepare(
        `INSERT OR REPLACE INTO "${dbTable}" (${columns.map(c => `"${mapColumnName(c)}"`).join(', ')}) 
         VALUES (${columns.map(() => '?').join(', ')})`
      );

      const insertMany = sqlite.transaction((items: any[]) => {
        for (const row of items) {
          const values = columns.map(col => {
            const val = row[col];
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
          });
          insertStmt.run(...values);
        }
      });

      insertMany(rows);
      console.log(`  ✅ ${table}: ${rows.length} 条`);
      results.push({ table, count: rows.length, status: 'ok' });
    } catch (e: any) {
      console.log(`  ❌ ${table}: ${e.message}`);
      results.push({ table, count: 0, status: 'error' });
    }
  }

  // 6. 清理旧备份（保留最近4周）
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();
  
  if (backups.length > 4) {
    backups.slice(4).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    });
    console.log(`\n🧹 已清理 ${backups.length - 4} 个旧备份`);
  }

  sqlite.close();
  await pg.$disconnect();

  console.log(`\n✅ 备份完成! 共 ${results.filter(r => r.status === 'ok').length} 张表`);
}

// Prisma 模型名 → 数据库表名映射
function mapTableName(model: string): string {
  const mapping: Record<string, string> = {
    user: 'users',
    customer: 'customers',
    contact: 'contacts',
    supplier: 'suppliers',
    supplierContact: 'supplier_contacts',
    supplierCommunication: 'supplier_communications',
    supplierRiskEvent: 'supplier_risk_events',
    product: 'products',
    order: 'orders',
    orderItem: 'order_items',
    file: 'files',
    activityLog: 'activity_logs',
    userSkill: 'user_skills',
    emailConfig: 'email_configs',
    inquiry: 'inquiries',
    inquiryReply: 'inquiry_replies',
    scheduledFollowUp: 'scheduled_follow_ups',
    followUp: 'follow_ups',
    followUpScript: 'follow_up_scripts',
    customerNeed: 'customer_needs',
    developmentPlan: 'development_plans',
  };
  return mapping[model] || model;
}

function mapColumnName(col: string): string {
  return col.replace(/([A-Z])/g, '_$1').toLowerCase();
}

backup();
