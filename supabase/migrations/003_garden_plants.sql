-- ============================================
-- Phase 2: 花园植物表
-- 存储 AI 对话中生长的知识植物
-- ============================================

CREATE TABLE IF NOT EXISTS garden_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  plant_type TEXT NOT NULL DEFAULT 'seed'
    CHECK (plant_type IN ('seed', 'sprout', 'growing', 'blooming', 'withered')),
  subject TEXT CHECK (subject IN ('math', 'chinese', 'english')),
  knowledge_tags TEXT[] DEFAULT '{}',
  source_conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  growth_stage INT NOT NULL DEFAULT 0 CHECK (growth_stage >= 0 AND growth_stage <= 100),
  last_watered_at TIMESTAMPTZ,
  position_x REAL NOT NULL DEFAULT 50,
  position_y REAL NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引：按孩子查植物
CREATE INDEX IF NOT EXISTS idx_garden_plants_child ON garden_plants(child_id);

-- 索引：按学科过滤
CREATE INDEX IF NOT EXISTS idx_garden_plants_subject ON garden_plants(child_id, subject);

-- 索引：按对话来源查植物
CREATE INDEX IF NOT EXISTS idx_garden_plants_conversation ON garden_plants(source_conversation_id);

-- RLS：孩子只能看自己的植物
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Children can view own plants" ON garden_plants;
CREATE POLICY "Children can view own plants"
  ON garden_plants FOR SELECT
  USING (auth.uid() = child_id);

DROP POLICY IF EXISTS "Children can insert own plants" ON garden_plants;
CREATE POLICY "Children can insert own plants"
  ON garden_plants FOR INSERT
  WITH CHECK (auth.uid() = child_id);

DROP POLICY IF EXISTS "Children can update own plants" ON garden_plants;
CREATE POLICY "Children can update own plants"
  ON garden_plants FOR UPDATE
  USING (auth.uid() = child_id);

-- 家长也能查看子女的植物
DROP POLICY IF EXISTS "Parents can view child plants" ON garden_plants;
CREATE POLICY "Parents can view child plants"
  ON garden_plants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = garden_plants.child_id
        AND profiles.parent_id = auth.uid()
    )
  );
