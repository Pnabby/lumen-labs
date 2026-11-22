CREATE TABLE enquiries (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX enquiries_email_created_idx ON enquiries (email, created_at);
