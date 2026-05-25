import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/creations/[id] — 获取创作详情 + 所有 pages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  // 获取创作
  const { data: creation, error: creationErr } = await supabase
    .from('creations')
    .select('*')
    .eq('id', id)
    .single()

  if (creationErr || !creation) {
    return Response.json({ error: '创作不存在' }, { status: 404 })
  }

  // 获取所有页面
  const { data: pages } = await supabase
    .from('creation_pages')
    .select('*')
    .eq('creation_id', id)
    .order('page_number', { ascending: true })

  return Response.json({ creation, pages: pages || [] })
}

/**
 * PATCH /api/creations/[id] — 更新创作
 * Body: { title?, status?, is_favorite?, content?, cover_emoji? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  // 只允许更新特定字段
  const allowedFields = ['title', 'status', 'is_favorite', 'content', 'cover_emoji', 'word_count', 'knowledge_tags']
  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key]
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: '没有要更新的字段' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creations')
    .update(updateData)
    .eq('id', id)
    .eq('child_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Creation update error:', error)
    return Response.json({ error: '更新失败' }, { status: 500 })
  }

  return Response.json({ creation: data })
}
