ALTER TABLE companies
ADD COLUMN IF NOT EXISTS interest_level TEXT NOT NULL DEFAULT '妥当';

ALTER TABLE companies
ALTER COLUMN interest_level SET DEFAULT '妥当';

UPDATE companies
SET interest_level = CASE interest_level
  WHEN '未設定' THEN '妥当'
  WHEN '高' THEN '本命'
  WHEN '中' THEN '妥当'
  WHEN '低' THEN '抑え'
  ELSE interest_level
END
WHERE interest_level IN ('未設定', '高', '中', '低');

ALTER TABLE selection_steps
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0;
