import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'illustrations'

export function parseDataUri(dataUri: string): { contentType: string; buffer: Buffer; ext: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  const contentType = match[1]
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  return {
    contentType,
    ext,
    buffer: Buffer.from(match[2], 'base64'),
  }
}

export function buildIllustrationPath(userId: string, conversationId: string | undefined, ext: string): string {
  const folder = conversationId || 'general'
  return `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
}

export function extensionFromContentType(contentType: string): string {
  const normalized = contentType.split(';')[0].trim().toLowerCase()
  if (normalized === 'image/jpeg') return 'jpg'
  if (normalized === 'image/webp') return 'webp'
  if (normalized === 'image/gif') return 'gif'
  return 'png'
}

/**
 * 将 AI 返回的临时 URL 或 data URI 上传到 Supabase Storage，返回永久公开 URL。
 * 上传失败时返回 null，由调用方回退到原始 URL。
 */
export async function persistIllustrationToStorage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  sourceUrl: string,
): Promise<string | null> {
  let buffer: Buffer
  let contentType: string
  let ext: string

  if (sourceUrl.startsWith('data:')) {
    const parsed = parseDataUri(sourceUrl)
    if (!parsed) return null
    buffer = parsed.buffer
    contentType = parsed.contentType
    ext = parsed.ext
  } else {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    buffer = Buffer.from(arr)
    contentType = res.headers.get('content-type') || 'image/png'
    ext = extensionFromContentType(contentType)
  }

  const path = buildIllustrationPath(userId, conversationId, ext)

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  })

  if (error) {
    console.warn('[Storage] illustration upload failed:', error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
