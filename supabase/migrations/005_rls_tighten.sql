-- ============================================
-- RLS 收紧 — materials / content_schedules / data_sources
--
-- 问题：原策略 materials SELECT USING (true) 导致任何登录用户
--       可以看到所有家长上传的学习资料和数据源。
--
-- 修复：
--   materials:    家长只能看自己创建的 + 公共资料（system）
--                 孩子只看到 approved 状态的
--   content_schedules: 限定为家长管理、孩子通过 goal 关联读取
--   data_sources:     仅创建者可见
-- ============================================

-- ============================================
-- 1. materials — 收紧读取
-- ============================================

-- 删除原宽松策略
DROP POLICY IF EXISTS "查看学习资料" ON materials;

-- 新策略：
-- 家长：看到自己创建的 + AI 生成的 + 已审核的公共资料
-- 孩子：只看到已审核通过的
CREATE POLICY "查看学习资料_收紧" ON materials
  FOR SELECT USING (
    CASE
      -- 家长：自己创建的、或已审核的
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent') THEN
        created_by = auth.uid() OR status = 'approved' OR source = 'ai_generated'
      -- 孩子：只看已审核
      ELSE
        status = 'approved'
    END
  );

-- 收紧写操作：家长只能修改/删除自己创建的
DROP POLICY IF EXISTS "更新学习资料" ON materials;
DROP POLICY IF EXISTS "删除学习资料" ON materials;

CREATE POLICY "更新学习资料_收紧" ON materials
  FOR UPDATE USING (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

CREATE POLICY "删除学习资料_收紧" ON materials
  FOR DELETE USING (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- ============================================
-- 2. content_schedules — 收紧读取
--    content_schedules 通过 goal_id → learning_goals 关联
--    家长：管理所有排期
--    孩子：只读取与自己学习计划相关的排期
-- ============================================

DROP POLICY IF EXISTS "查看内容排期" ON content_schedules;

CREATE POLICY "查看内容排期_收紧" ON content_schedules
  FOR SELECT USING (
    -- 家长可看所有
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
    OR
    -- 孩子只看 pending/completed 状态的
    (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'child')
      AND status IN ('pending', 'completed')
    )
  );

-- ============================================
-- 3. data_sources — 收紧为仅创建者可见
-- ============================================

DROP POLICY IF EXISTS "查看数据源" ON data_sources;

CREATE POLICY "查看数据源_收紧" ON data_sources
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = data_sources.created_by)
    )
  );

-- ============================================
-- 4. ai_recommendations — 收紧家长只看自己孩子的
-- ============================================

DROP POLICY IF EXISTS "查看AI推荐" ON ai_recommendations;

CREATE POLICY "查看AI推荐_收紧" ON ai_recommendations
  FOR SELECT USING (
    child_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = ai_recommendations.child_id)
    )
  );
