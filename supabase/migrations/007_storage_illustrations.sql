-- AI 插图永久存储 bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'illustrations',
  'illustrations',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 仅允许用户上传到自己的目录 {user_id}/...
CREATE POLICY "illustrations_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 公开读（URL 含 UUID，不可列举）
CREATE POLICY "illustrations_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'illustrations');

-- 用户可删除自己的文件
CREATE POLICY "illustrations_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
