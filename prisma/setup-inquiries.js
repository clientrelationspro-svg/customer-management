// Vercel 构建时创建询价管理相关表
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Setting up inquiries tables ===');
  
  // 使用 Prisma raw query 创建表（IF NOT EXISTS 防止重复）
  const queries = [
    `CREATE TABLE IF NOT EXISTS "email_configs" (
      "id" TEXT PRIMARY KEY,
      "imap_host" TEXT NOT NULL,
      "imap_port" INTEGER NOT NULL DEFAULT 993,
      "imap_user" TEXT NOT NULL,
      "imap_pass" TEXT NOT NULL,
      "smtp_host" TEXT NOT NULL,
      "smtp_port" INTEGER NOT NULL DEFAULT 465,
      "smtp_user" TEXT NOT NULL,
      "smtp_pass" TEXT NOT NULL,
      "from_name" TEXT NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "last_sync_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "inquiries" (
      "id" TEXT PRIMARY KEY,
      "email_config_id" TEXT,
      "customer_id" TEXT,
      "message_id" TEXT,
      "from_email" TEXT NOT NULL,
      "from_name" TEXT,
      "subject" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "body_html" TEXT,
      "language" TEXT,
      "status" TEXT NOT NULL DEFAULT 'new',
      "product_interested" TEXT,
      "quantity" TEXT,
      "delivery_required" TEXT,
      "ai_summary" TEXT,
      "ai_draft_subject" TEXT,
      "ai_draft_body" TEXT,
      "final_subject" TEXT,
      "final_body" TEXT,
      "replied_at" TIMESTAMP(3),
      "reply_message_id" TEXT,
      "scheduled_at" TIMESTAMP(3),
      "follow_up_enabled" BOOLEAN NOT NULL DEFAULT false,
      "follow_up_interval" INTEGER,
      "follow_up_until" TIMESTAMP(3),
      "next_follow_up_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "inquiry_replies" (
      "id" TEXT PRIMARY KEY,
      "inquiry_id" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "inquiries_message_id_key" ON "inquiries"("message_id")`,
  ];

  // 补充：为已有表添加新列
  const alterQueries = [
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3)`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "follow_up_enabled" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "follow_up_interval" INTEGER`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "follow_up_until" TIMESTAMP(3)`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "next_follow_up_at" TIMESTAMP(3)`,
  ];

  for (const query of alterQueries) {
    try {
      await prisma.$executeRawUnsafe(query);
      console.log('  ✓ alter executed');
    } catch (e) {
      console.log('  ⚠ ' + e.message);
    }
  }
  
  console.log('=== Setup complete ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
