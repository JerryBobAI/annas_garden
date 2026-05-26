-- ============================================
-- Anna's Garden - 智能课程引擎
-- Phase 4: 知识图谱 + 自适应 + 报告
-- ============================================

-- ────────────────────────────────────────────
-- 1. knowledge_graph — 知识点关联图
-- ────────────────────────────────────────────
CREATE TABLE knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  from_point TEXT NOT NULL,                -- 前置知识点
  to_point TEXT NOT NULL,                  -- 后置知识点
  relation_type TEXT NOT NULL CHECK (relation_type IN ('prerequisite', 'related', 'includes')),
  weight REAL DEFAULT 1.0,                 -- 关联强度 0-1
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject, from_point, to_point)
);

-- ────────────────────────────────────────────
-- 2. learning_reports — AI 学习报告
-- ────────────────────────────────────────────
CREATE TABLE learning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'milestone')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',     -- 结构化报告内容
  ai_summary TEXT,                         -- AI 生成的自然语言摘要
  ai_suggestions TEXT[],                   -- AI 建议列表
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 3. difficulty_history — 难度调整历史
-- ────────────────────────────────────────────
CREATE TABLE difficulty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_point TEXT NOT NULL,
  old_difficulty INTEGER NOT NULL,
  new_difficulty INTEGER NOT NULL,
  reason TEXT,                             -- "3_correct_streak" / "2_wrong_streak" / "manual"
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 4. content_imports — 家长内容导入记录
-- ────────────────────────────────────────────
CREATE TABLE content_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('text', 'pdf', 'image')),
  original_content TEXT,                   -- 原始输入文本
  file_url TEXT,                           -- 上传文件 URL (Supabase Storage)
  extracted_knowledge JSONB DEFAULT '{}',  -- AI 提取的知识点
  linked_goals UUID[],                     -- 关联的学习目标
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 5. garden_areas — 花园区域（可解锁）
-- ────────────────────────────────────────────
CREATE TABLE garden_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,                 -- "数学花田" "语文花园" "英语花坊"
  area_type TEXT NOT NULL CHECK (area_type IN ('default', 'unlockable')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  is_unlocked BOOLEAN DEFAULT false,
  unlock_condition JSONB DEFAULT '{}',     -- { "total_blooming": 5 } 等
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  width REAL DEFAULT 100,
  height REAL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, area_name)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_knowledge_graph_subject ON knowledge_graph(subject);
CREATE INDEX idx_knowledge_graph_from ON knowledge_graph(from_point);
CREATE INDEX idx_knowledge_graph_to ON knowledge_graph(to_point);
CREATE INDEX idx_learning_reports_child ON learning_reports(child_id);
CREATE INDEX idx_learning_reports_period ON learning_reports(period_start, period_end);
CREATE INDEX idx_difficulty_history_child ON difficulty_history(child_id);
CREATE INDEX idx_content_imports_parent ON content_imports(parent_id);
CREATE INDEX idx_garden_areas_child ON garden_areas(child_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_areas ENABLE ROW LEVEL SECURITY;

-- knowledge_graph: 所有人可读（全局数据）
CREATE POLICY "查看知识图谱" ON knowledge_graph FOR SELECT USING (true);
CREATE POLICY "管理知识图谱" ON knowledge_graph
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- learning_reports: 家长看孩子的
CREATE POLICY "家长查看学习报告" ON learning_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = learning_reports.child_id)
    )
  );

-- difficulty_history: 孩子自己或家长可看
CREATE POLICY "查看难度历史" ON difficulty_history
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = difficulty_history.child_id)
    )
  );

-- content_imports: 家长管理自己的
CREATE POLICY "家长管理导入" ON content_imports
  FOR ALL USING (parent_id = auth.uid());

-- garden_areas: 孩子自己或家长可看
CREATE POLICY "查看花园区域" ON garden_areas
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = garden_areas.child_id)
    )
  );
CREATE POLICY "创建花园区域" ON garden_areas
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新花园区域" ON garden_areas
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- 知识图谱种子数据
-- ============================================

-- 数学知识图谱 (一年级下学期)
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('math', '10以内加法',     '20以内加法',       'prerequisite', 1.0),
  ('math', '10以内减法',     '20以内退位减法',   'prerequisite', 1.0),
  ('math', '20以内加法',     '20以内退位减法',   'related',      0.7),
  ('math', '认识数字',       '100以内数',        'prerequisite', 1.0),
  ('math', '认识图形',       '图形拼组',        'prerequisite', 0.8),
  ('math', '100以内数',      '100以内加减法',    'prerequisite', 1.0),
  ('math', '20以内加法',     '100以内加减法',    'prerequisite', 0.9),
  ('math', '20以内退位减法', '100以内加减法',    'prerequisite', 0.9),
  ('math', '认识人民币',     '简单购物计算',     'prerequisite', 0.8),
  ('math', '100以内加减法',  '简单购物计算',     'related',      0.6);

-- 语文知识图谱
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('chinese', '声母',         '拼音拼读',        'prerequisite', 1.0),
  ('chinese', '韵母',         '拼音拼读',        'prerequisite', 1.0),
  ('chinese', '拼音拼读',     '自主阅读',        'prerequisite', 0.8),
  ('chinese', '基础识字',     '看图写话',        'prerequisite', 0.8),
  ('chinese', '朗读',         '阅读理解',        'related',      0.6),
  ('chinese', '基础识字',     '自主阅读',        'prerequisite', 0.9),
  ('chinese', '自主阅读',     '阅读理解',        'prerequisite', 0.8),
  ('chinese', '看图写话',     '简单作文',        'prerequisite', 0.7),
  ('chinese', '笔画笔顺',     '基础识字',        'prerequisite', 1.0),
  ('chinese', '偏旁部首',     '基础识字',        'related',      0.7);

-- 英语知识图谱
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('english', '字母认知',     '自然拼读',        'prerequisite', 1.0),
  ('english', '基础单词',     '简单句子',        'prerequisite', 0.9),
  ('english', '英文歌谣',     '发音语感',        'related',      0.7),
  ('english', '自然拼读',     '基础单词',        'prerequisite', 0.8),
  ('english', '简单句子',     '简单对话',        'prerequisite', 0.8),
  ('english', '发音语感',     '简单对话',        'related',      0.6),
  ('english', '基础单词',     '阅读启蒙',        'prerequisite', 0.7),
  ('english', '简单句子',     '阅读启蒙',        'related',      0.5);
