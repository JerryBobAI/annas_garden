-- ============================================
-- Anna's Garden - AI 对话系统表
-- Phase 1: AI 对话核心
-- ============================================

-- ────────────────────────────────────────────
-- 1. conversations — AI 对话会话
-- ────────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('explore', 'quest', 'create')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  title TEXT,                              -- 对话标题（AI 自动生成或默认）
  summary TEXT,                            -- 对话摘要（AI 后处理生成）
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',             -- { garden_events: [], knowledge_tags: [], difficulty_avg: 0 }
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,                    -- 对话结束时间，NULL 表示进行中
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 2. messages — 对话消息
-- ────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,                   -- 纯文字内容
  structured_output JSONB,                 -- AI 结构化指令 { emotion, options[], knowledge_tags[], garden_event }
  voice_url TEXT,                          -- 语音文件 URL（Phase 2 使用，先预留）
  token_count INTEGER DEFAULT 0,           -- 该消息的 token 数
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 3. curiosity_seeds — 好奇心种子
-- （孩子在探索模式中提出的问题）
-- ────────────────────────────────────────────
CREATE TABLE curiosity_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,                  -- 孩子问的原始问题
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_tags TEXT[] DEFAULT '{}',
  explored BOOLEAN DEFAULT false,          -- 是否已深入探索
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 4. cognitive_profiles — 认知档案
-- （每个孩子一条记录，持续更新）
-- ────────────────────────────────────────────
CREATE TABLE cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_mode TEXT DEFAULT 'explore' CHECK (preferred_mode IN ('explore', 'quest', 'create')),
  attention_span_avg INTEGER DEFAULT 600,  -- 平均专注时长（秒），默认 10 分钟
  vocabulary_level INTEGER DEFAULT 1,      -- 词汇水平估计 1-10
  interests TEXT[] DEFAULT '{}',           -- 兴趣标签
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 5. knowledge_mastery — 知识掌握度
-- （每个知识点一条记录）
-- ────────────────────────────────────────────
CREATE TABLE knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_point TEXT NOT NULL,           -- 知识点名称，如 "加法" "声母"
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  source_conversations UUID[] DEFAULT '{}', -- 关联的对话 ID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, subject, knowledge_point)
);

-- ────────────────────────────────────────────
-- 6. garden_plants — 花园植物
-- （Phase 2 使用，Phase 1 先建表）
-- ────────────────────────────────────────────
CREATE TABLE garden_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,                               -- 植物名字（孩子可自定义）
  plant_type TEXT NOT NULL DEFAULT 'seed' CHECK (plant_type IN ('seed', 'sprout', 'growing', 'blooming', 'withered')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_tags TEXT[] DEFAULT '{}',
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  growth_stage INTEGER DEFAULT 0 CHECK (growth_stage >= 0 AND growth_stage <= 100),
  last_watered_at TIMESTAMPTZ DEFAULT now(),
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_conversations_child ON conversations(child_id);
CREATE INDEX idx_conversations_mode ON conversations(mode);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_curiosity_seeds_child ON curiosity_seeds(child_id);
CREATE INDEX idx_cognitive_profiles_child ON cognitive_profiles(child_id);
CREATE INDEX idx_knowledge_mastery_child ON knowledge_mastery(child_id);
CREATE INDEX idx_knowledge_mastery_subject ON knowledge_mastery(child_id, subject);
CREATE INDEX idx_garden_plants_child ON garden_plants(child_id);

-- ============================================
-- RLS 策略
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE curiosity_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;

-- conversations: 孩子看自己的，家长看孩子的
CREATE POLICY "孩子查看自己的对话" ON conversations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的对话" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = conversations.child_id)
    )
  );
CREATE POLICY "孩子创建对话" ON conversations
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新自己的对话" ON conversations
  FOR UPDATE USING (child_id = auth.uid());

-- messages: 通过 conversation 的权限间接控制
CREATE POLICY "查看对话消息" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.child_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'parent'
            AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = c.child_id)
        ))
    )
  );
CREATE POLICY "创建对话消息" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.child_id = auth.uid()
    )
  );

-- curiosity_seeds: 同 conversations 逻辑
CREATE POLICY "孩子查看自己的种子" ON curiosity_seeds
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的种子" ON curiosity_seeds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = curiosity_seeds.child_id)
    )
  );
CREATE POLICY "孩子创建种子" ON curiosity_seeds
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新种子" ON curiosity_seeds
  FOR UPDATE USING (child_id = auth.uid());

-- cognitive_profiles: 孩子读自己的，系统写入
CREATE POLICY "查看认知档案" ON cognitive_profiles
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = cognitive_profiles.child_id)
    )
  );
CREATE POLICY "创建认知档案" ON cognitive_profiles
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新认知档案" ON cognitive_profiles
  FOR UPDATE USING (child_id = auth.uid());

-- knowledge_mastery: 同认知档案
CREATE POLICY "查看知识掌握" ON knowledge_mastery
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = knowledge_mastery.child_id)
    )
  );
CREATE POLICY "创建知识掌握" ON knowledge_mastery
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新知识掌握" ON knowledge_mastery
  FOR UPDATE USING (child_id = auth.uid());

-- garden_plants: 同认知档案
CREATE POLICY "查看花园植物" ON garden_plants
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = garden_plants.child_id)
    )
  );
CREATE POLICY "创建花园植物" ON garden_plants
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新花园植物" ON garden_plants
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- updated_at 触发器（复用 001 中的 update_updated_at 函数）
-- ============================================
CREATE TRIGGER cognitive_profiles_updated_at
  BEFORE UPDATE ON cognitive_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_mastery_updated_at
  BEFORE UPDATE ON knowledge_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
