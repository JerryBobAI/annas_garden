import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/conversations
 * 返回当前孩子的对话列表
 * Query params: ?mode=explore&limit=20
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('child_id', user.id)
    .order('started_at', { ascending: false })
    .limit(Math.min(limit, 50)) // 最多 50 条

  if (mode && ['explore', 'quest', 'create'].includes(mode)) {
    query = query.eq('mode', mode)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get conversations error:', error)
    return Response.json({ error: '获取对话列表失败' }, { status: 500 })
  }

  return Response.json({ conversations: data || [] })
}

/**
 * POST /api/conversations
 * 创建新对话
 * Body: { mode, subject? }
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: { mode: string; subject?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { mode, subject } = body

  if (!['explore', 'quest', 'create'].includes(mode)) {
    return Response.json({ error: '无效的学习模式' }, { status: 400 })
  }

  if (subject && !['chinese', 'math', 'english'].includes(subject)) {
    return Response.json({ error: '无效的学科' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      child_id: user.id,
      mode,
      subject: subject || null,
      metadata: { garden_events: [], knowledge_tags: [], difficulty_avg: 0 },
    })
    .select('id, mode, subject, started_at')
    .single()

  if (error) {
    console.error('Create conversation error:', error)
    return Response.json({ error: '创建对话失败' }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
