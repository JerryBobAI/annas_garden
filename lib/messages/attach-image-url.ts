import type { SupabaseClient } from '@supabase/supabase-js'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 将插图 URL 写入最近一条 assistant 消息的 structured_output.image_url。
 * 与 chat 流式入库存在竞态，故带短重试。
 */
export async function attachImageUrlToLatestAssistantMessage(
  supabase: SupabaseClient,
  conversationId: string,
  imageUrl: string,
  maxAttempts = 6,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: msgRow, error: selectError } = await supabase
      .from('messages')
      .select('id, structured_output')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError) {
      console.warn('[messages] attach image select failed:', selectError.message)
      return null
    }

    if (msgRow) {
      const so = (msgRow.structured_output || {}) as Record<string, unknown>
      const { error: updateError } = await supabase
        .from('messages')
        .update({ structured_output: { ...so, image_url: imageUrl } })
        .eq('id', msgRow.id)

      if (updateError) {
        console.warn('[messages] attach image update failed:', updateError.message)
        return null
      }
      return msgRow.id
    }

    if (attempt < maxAttempts - 1) {
      await sleep(350)
    }
  }

  return null
}
