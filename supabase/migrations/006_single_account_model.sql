-- ============================================
-- 单账号模型迁移（幂等，可安全重跑）
--
-- 改动：去掉 role 区分，一个邮箱同时可以用孩子端和家长端
-- 家长端通过 PIN 码保护（middleware 层），不再依赖 profiles.role
-- ============================================

-- ============================================
-- 1. profiles — 新用户默认 'parent'
-- ============================================
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'parent';

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

-- ============================================
-- 2. conversations (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看对话" ON conversations;
DROP POLICY IF EXISTS "创建对话" ON conversations;
DROP POLICY IF EXISTS "更新对话" ON conversations;

CREATE POLICY "查看对话" ON conversations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "创建对话" ON conversations
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新对话" ON conversations
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- 3. messages (通过 conversation 关联)
-- ============================================
DROP POLICY IF EXISTS "查看消息" ON messages;
DROP POLICY IF EXISTS "创建消息" ON messages;

CREATE POLICY "查看消息" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.child_id = auth.uid())
  );
CREATE POLICY "创建消息" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.child_id = auth.uid())
  );

-- ============================================
-- 4. cognitive_profiles (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看认知档案" ON cognitive_profiles;
DROP POLICY IF EXISTS "创建认知档案" ON cognitive_profiles;
DROP POLICY IF EXISTS "更新认知档案" ON cognitive_profiles;

CREATE POLICY "查看认知档案" ON cognitive_profiles
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "创建认知档案" ON cognitive_profiles
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新认知档案" ON cognitive_profiles
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- 5. learning_goals (无 child_id，通过 semester_id 关联)
-- ============================================
DROP POLICY IF EXISTS "查看学习目标" ON learning_goals;
DROP POLICY IF EXISTS "管理学习目标" ON learning_goals;

CREATE POLICY "查看学习目标" ON learning_goals
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "管理学习目标" ON learning_goals
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- 6. garden_plants (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看花园植物" ON garden_plants;
DROP POLICY IF EXISTS "管理花园植物" ON garden_plants;

CREATE POLICY "查看花园植物" ON garden_plants
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理花园植物" ON garden_plants
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 7. learning_records (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看学习记录" ON learning_records;
DROP POLICY IF EXISTS "创建学习记录" ON learning_records;

CREATE POLICY "查看学习记录" ON learning_records
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "创建学习记录" ON learning_records
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- ============================================
-- 8. wrong_answers (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看错题" ON wrong_answers;
DROP POLICY IF EXISTS "创建错题" ON wrong_answers;
DROP POLICY IF EXISTS "更新错题" ON wrong_answers;

CREATE POLICY "查看错题" ON wrong_answers
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "创建错题" ON wrong_answers
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新错题" ON wrong_answers
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- 9. materials (created_by ✓, 无 child_id)
-- ============================================
DROP POLICY IF EXISTS "查看学习资料" ON materials;
DROP POLICY IF EXISTS "查看学习资料_收紧" ON materials;
DROP POLICY IF EXISTS "创建学习资料" ON materials;
DROP POLICY IF EXISTS "更新学习资料" ON materials;
DROP POLICY IF EXISTS "更新学习资料_收紧" ON materials;
DROP POLICY IF EXISTS "删除学习资料" ON materials;
DROP POLICY IF EXISTS "删除学习资料_收紧" ON materials;

CREATE POLICY "查看学习资料" ON materials
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "创建学习资料" ON materials
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "更新学习资料" ON materials
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "删除学习资料" ON materials
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- 10. exercises (无 child_id, 通过 material_id 关联)
-- ============================================
DROP POLICY IF EXISTS "查看练习题" ON exercises;
DROP POLICY IF EXISTS "创建练习题" ON exercises;
DROP POLICY IF EXISTS "更新练习题" ON exercises;
DROP POLICY IF EXISTS "删除练习题" ON exercises;

CREATE POLICY "查看练习题" ON exercises
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "创建练习题" ON exercises
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "更新练习题" ON exercises
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "删除练习题" ON exercises
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 11. study_plans (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看学习计划" ON study_plans;
DROP POLICY IF EXISTS "管理学习计划" ON study_plans;

CREATE POLICY "查看学习计划" ON study_plans
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理学习计划" ON study_plans
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 12. content_schedules (无 child_id)
-- ============================================
DROP POLICY IF EXISTS "查看内容排期" ON content_schedules;
DROP POLICY IF EXISTS "查看内容排期_收紧" ON content_schedules;
DROP POLICY IF EXISTS "管理内容排期" ON content_schedules;

CREATE POLICY "查看内容排期" ON content_schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "管理内容排期" ON content_schedules
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- 13. data_sources (created_by ✓)
-- ============================================
DROP POLICY IF EXISTS "查看数据源" ON data_sources;
DROP POLICY IF EXISTS "查看数据源_收紧" ON data_sources;
DROP POLICY IF EXISTS "管理数据源" ON data_sources;

CREATE POLICY "查看数据源" ON data_sources
  FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "管理数据源" ON data_sources
  FOR ALL USING (created_by = auth.uid());

-- ============================================
-- 14. ai_recommendations (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看AI推荐" ON ai_recommendations;
DROP POLICY IF EXISTS "查看AI推荐_收紧" ON ai_recommendations;
DROP POLICY IF EXISTS "管理AI推荐" ON ai_recommendations;

CREATE POLICY "查看AI推荐" ON ai_recommendations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理AI推荐" ON ai_recommendations
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 15. creations (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看创作" ON creations;
DROP POLICY IF EXISTS "管理创作" ON creations;

CREATE POLICY "查看创作" ON creations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理创作" ON creations
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 16. creation_pages (通过 creation 关联，无 child_id)
-- ============================================
DROP POLICY IF EXISTS "查看创作页面" ON creation_pages;
DROP POLICY IF EXISTS "管理创作页面" ON creation_pages;

CREATE POLICY "查看创作页面" ON creation_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id AND c.child_id = auth.uid())
  );
CREATE POLICY "管理创作页面" ON creation_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id AND c.child_id = auth.uid())
  );

-- ============================================
-- 17. learning_reports (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看学习报告" ON learning_reports;
DROP POLICY IF EXISTS "管理学习报告" ON learning_reports;

CREATE POLICY "查看学习报告" ON learning_reports
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理学习报告" ON learning_reports
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 18. difficulty_history (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看难度历史" ON difficulty_history;
DROP POLICY IF EXISTS "管理难度历史" ON difficulty_history;

CREATE POLICY "查看难度历史" ON difficulty_history
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理难度历史" ON difficulty_history
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 19. content_imports (parent_id ✓, 不是 child_id)
-- ============================================
DROP POLICY IF EXISTS "查看内容导入" ON content_imports;
DROP POLICY IF EXISTS "管理内容导入" ON content_imports;

CREATE POLICY "查看内容导入" ON content_imports
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "管理内容导入" ON content_imports
  FOR ALL USING (parent_id = auth.uid());

-- ============================================
-- 20. garden_areas (child_id ✓)
-- ============================================
DROP POLICY IF EXISTS "查看花园区域" ON garden_areas;
DROP POLICY IF EXISTS "管理花园区域" ON garden_areas;

CREATE POLICY "查看花园区域" ON garden_areas
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "管理花园区域" ON garden_areas
  FOR ALL USING (child_id = auth.uid());

-- ============================================
-- 21. knowledge_graph (公共数据，登录可读)
-- ============================================
DROP POLICY IF EXISTS "查看知识图谱" ON knowledge_graph;

CREATE POLICY "查看知识图谱" ON knowledge_graph
  FOR SELECT USING (auth.uid() IS NOT NULL);
