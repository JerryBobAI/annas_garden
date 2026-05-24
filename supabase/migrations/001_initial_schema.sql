-- ============================================
-- Anna's Garden - 数据库初始化
-- 一年级下学期儿童学习平台
-- ============================================

-- 1. 用户档案（扩展 Supabase Auth）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  display_name TEXT,
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 学期
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "一年级下学期"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grade TEXT NOT NULL,                   -- "一年级"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 学习目标
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  week_number INTEGER NOT NULL,          -- 第几周
  title TEXT NOT NULL,                   -- "20以内退位减法"
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('core', 'important', 'normal')),
  mastery_threshold INTEGER DEFAULT 80,  -- 掌握阈值（正确率%）
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 学习资料
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  grade TEXT NOT NULL DEFAULT '一年级',
  type TEXT NOT NULL CHECK (type IN ('textbook', 'exercise', 'video', 'audio', 'image')),
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',            -- 结构化内容
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_generated', 'external')),
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  goal_id UUID REFERENCES learning_goals(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 练习题
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  question JSONB NOT NULL,               -- 支持多种题型结构
  options JSONB,                         -- 选择题选项
  correct_answer TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  knowledge_points TEXT[] DEFAULT '{}',  -- 知识点标签
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 学习记录
CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('view', 'practice', 'review')),
  duration INTEGER DEFAULT 0,            -- 秒
  score INTEGER,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 错题记录
CREATE TABLE wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  last_wrong_at TIMESTAMPTZ DEFAULT now(),
  mastered BOOLEAN NOT NULL DEFAULT false,
  mastered_at TIMESTAMPTZ,
  UNIQUE(child_id, exercise_id)
);

-- 8. 学习计划
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  daily_goal JSONB DEFAULT '{}',         -- 每日目标配置
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 内容排期
CREATE TABLE content_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'ai_recommended', 'external')),
  plan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. 外部数据源
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'api', 'scrape')),
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. AI 推荐
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  recommend_reason TEXT,
  confidence REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_profiles_parent ON profiles(parent_id);
CREATE INDEX idx_materials_subject ON materials(subject);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_materials_goal ON materials(goal_id);
CREATE INDEX idx_exercises_material ON exercises(material_id);
CREATE INDEX idx_learning_records_child ON learning_records(child_id);
CREATE INDEX idx_learning_records_created ON learning_records(created_at);
CREATE INDEX idx_wrong_answers_child ON wrong_answers(child_id);
CREATE INDEX idx_wrong_answers_mastered ON wrong_answers(mastered);
CREATE INDEX idx_goals_semester ON learning_goals(semester_id);
CREATE INDEX idx_goals_subject ON learning_goals(subject);
CREATE INDEX idx_content_schedules_date ON content_schedules(plan_date);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能看到自己和自己的孩子
CREATE POLICY "查看自己的档案" ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = parent_id);
CREATE POLICY "更新自己的档案" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "创建自己的档案" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- semesters: 所有人可读
CREATE POLICY "查看学期" ON semesters FOR SELECT USING (true);

-- learning_goals: 所有人可读
CREATE POLICY "查看学习目标" ON learning_goals FOR SELECT USING (true);

-- materials: 家长可全部操作，孩子只读
CREATE POLICY "查看学习资料" ON materials FOR SELECT USING (true);
CREATE POLICY "创建学习资料" ON materials
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );
CREATE POLICY "更新学习资料" ON materials
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );
CREATE POLICY "删除学习资料" ON materials
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- exercises: 家长可全部操作，孩子只读
CREATE POLICY "查看练习题" ON exercises FOR SELECT USING (true);
CREATE POLICY "创建练习题" ON exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );
CREATE POLICY "更新练习题" ON exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );
CREATE POLICY "删除练习题" ON exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- learning_records: 只能操作自己或自己孩子的记录
CREATE POLICY "查看学习记录" ON learning_records
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND id = learning_records.child_id) OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent' AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = learning_records.child_id))
  );
CREATE POLICY "创建学习记录" ON learning_records
  FOR INSERT WITH CHECK (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );

-- wrong_answers: 同 learning_records
CREATE POLICY "查看错题" ON wrong_answers
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent' AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = wrong_answers.child_id))
  );
CREATE POLICY "创建错题" ON wrong_answers
  FOR INSERT WITH CHECK (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );
CREATE POLICY "更新错题" ON wrong_answers
  FOR UPDATE USING (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent' AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = wrong_answers.child_id))
  );

-- study_plans: 家长管理，孩子可读
CREATE POLICY "查看学习计划" ON study_plans
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'parent' AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = study_plans.child_id))
  );
CREATE POLICY "管理学习计划" ON study_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- content_schedules: 家长操作
CREATE POLICY "查看内容排期" ON content_schedules FOR SELECT USING (true);
CREATE POLICY "管理内容排期" ON content_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- data_sources: 家长管理
CREATE POLICY "查看数据源" ON data_sources FOR SELECT USING (true);
CREATE POLICY "管理数据源" ON data_sources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- ai_recommendations: 家长管理
CREATE POLICY "查看AI推荐" ON ai_recommendations
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );
CREATE POLICY "管理AI推荐" ON ai_recommendations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- ============================================
-- 自动创建 profile 的触发器
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    'parent',
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- updated_at 自动更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
