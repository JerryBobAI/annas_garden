-- ============================================
-- Anna's Garden - 创作系统表
-- Phase 3: 创造模式
-- ============================================

-- ────────────────────────────────────────────
-- 1. creations — 创作作品
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creation_type TEXT NOT NULL CHECK (creation_type IN ('story', 'math_exploration', 'english_adventure')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  content JSONB NOT NULL DEFAULT '{}',
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  knowledge_tags TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
  cover_emoji TEXT DEFAULT '📖',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 2. creation_pages — 创作"页面"
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('child', 'fairy', 'both')),
  content TEXT NOT NULL,
  illustration_prompt TEXT,
  knowledge_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creation_id, page_number)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_creations_child ON creations(child_id);
CREATE INDEX IF NOT EXISTS idx_creations_type ON creations(creation_type);
CREATE INDEX IF NOT EXISTS idx_creations_subject ON creations(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_creations_status ON creations(status);
CREATE INDEX IF NOT EXISTS idx_creation_pages_creation ON creation_pages(creation_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_pages ENABLE ROW LEVEL SECURITY;

-- creations: 孩子看自己的，家长看孩子的
CREATE POLICY "孩子查看自己的创作" ON creations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的创作" ON creations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = creations.child_id)
    )
  );
CREATE POLICY "孩子创建创作" ON creations
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新自己的创作" ON creations
  FOR UPDATE USING (child_id = auth.uid());

-- creation_pages: 通过 creation 间接控制
CREATE POLICY "查看创作页面" ON creation_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id
        AND (c.child_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'parent'
            AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = c.child_id)
        ))
    )
  );
CREATE POLICY "创建创作页面" ON creation_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id
        AND c.child_id = auth.uid()
    )
  );

-- ============================================
-- updated_at 触发器
-- ============================================
CREATE TRIGGER creations_updated_at
  BEFORE UPDATE ON creations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
