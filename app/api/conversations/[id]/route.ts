import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/conversations/[id]
 * 返回对话详情 + 消息历史
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { id } = await params

  // 获取对话
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (convError || !conversation) {
    return Response.json({ error: '对话不存在' }, { status: 404 })
  }

  // 获取消息列表
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    console.error('Get messages error:', msgError)
    return Response.json({ error: '获取消息失败' }, { status: 500 })
  }

  return Response.json({
    conversation,
    messages: messages || [],
  })
}

/**
 * PATCH /api/conversations/[id]
 * 更新对话（结束对话、更新标题）
 * Body: { ended_at?, title?, summary? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { id } = await params

  let body: { ended_at?: string; title?: string; summary?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  // 只允许更新特定字段
  const updates: Record<string, unknown> = {}
  if (body.ended_at) updates.ended_at = body.ended_at
  if (body.title) updates.title = body.title
  if (body.summary) updates.summary = body.summary

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: '没有需要更新的字段' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .eq('child_id', user.id) // 只能更新自己的对话
    .select()
    .single()

  if (error) {
    console.error('Update conversation error:', error)
    return Response.json({ error: '更新对话失败' }, { status: 500 })
  }

  return Response.json(data)
}
