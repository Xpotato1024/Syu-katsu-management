CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mypage_link TEXT NOT NULL DEFAULT '',
  mypage_id TEXT NOT NULL DEFAULT '',
  selection_flow TEXT NOT NULL DEFAULT '',
  selection_status TEXT NOT NULL DEFAULT '',
  es_content TEXT NOT NULL DEFAULT '',
  research_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_updated ON companies (user_id, updated_at DESC);
