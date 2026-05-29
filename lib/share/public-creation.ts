import { createServiceClient } from '@/lib/supabase/admin'

export interface PublicCreationPreview {
  id: string
  title: string
  cover_emoji: string
  subject: string
  word_count: number
  status: string
}

/** 仅已完成创作可公开分享（UUID 不可猜测 + 无敏感正文） */
export async function getPublicCreationPreview(
  id: string,
): Promise<PublicCreationPreview | null> {
  const admin = createServiceClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('creations')
    .select('id, title, cover_emoji, subject, word_count, status')
    .eq('id', id)
    .eq('status', 'completed')
    .maybeSingle()

  if (error || !data) return null
  return data as PublicCreationPreview
}
