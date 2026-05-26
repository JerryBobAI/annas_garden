-- 补全 learning_reports RLS：支持创建报告 + 孩子查看自己的报告

CREATE POLICY "孩子查看自己的学习报告" ON learning_reports
  FOR SELECT USING (child_id = auth.uid());

CREATE POLICY "创建学习报告" ON learning_reports
  FOR INSERT WITH CHECK (
    child_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = learning_reports.child_id)
    )
  );
