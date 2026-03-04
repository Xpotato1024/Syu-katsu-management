CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
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
