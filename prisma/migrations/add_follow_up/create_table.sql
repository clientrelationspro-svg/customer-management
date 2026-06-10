-- 创建客户跟进表
CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  contact_id TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  follow_up_matters TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  next_action TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'in_progress',
  last_follow_up_date DATETIME NOT NULL,
  next_follow_up_date DATETIME,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_follow_up_date ON follow_ups(next_follow_up_date);
