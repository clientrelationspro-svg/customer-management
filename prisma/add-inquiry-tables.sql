CREATE TABLE IF NOT EXISTS "email_configs" (
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
);

CREATE TABLE IF NOT EXISTS "inquiries" (
    "id" TEXT PRIMARY KEY,
    "email_config_id" TEXT REFERENCES "email_configs"("id"),
    "customer_id" TEXT,
    "message_id" TEXT UNIQUE,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "inquiry_replies" (
    "id" TEXT PRIMARY KEY,
    "inquiry_id" TEXT NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
