-- 允许账户更新自己对话下的消息（插图 URL 持久化等）
DROP POLICY IF EXISTS "更新对话消息" ON messages;

CREATE POLICY "更新对话消息" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.child_id = auth.uid()
    )
  );
