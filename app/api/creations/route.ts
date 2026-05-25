import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/creations — 获取创作列表
 * 查询参数: ?type=story&subject=chinese&status=completed&limit=20
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const type = searchParams.get('type')
  const subject = searchParams.get('subject')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  let query = supabase
    .from('creations')
    .select('*')
    .eq('child_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('creation_type', type)
  if (subject) query = query.eq('subject', subject)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('Creations query error:', error)
    return Response.json({ error: '获取创作列表失败' }, { status: 500 })
  }

  return Response.json({ creations: data || [] })
}

/**
 * POST /api/creations — 创建新创作
 * Body: { creation_type, title, subject, cover_emoji?, conversation_id? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: {
    creation_type: string
    title: string
    subject: string
    cover_emoji?: string
    conversation_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { creation_type, title, subject, cover_emoji, conversation_id } = body

  if (!creation_type || !title || !subject) {
    return Response.json({ error: '缺少必要字段' }, { status: 400 })
  }

  const validTypes = ['story', 'math_exploration', 'english_adventure']
  const validSubjects = ['chinese', 'math', 'english']

  if (!validTypes.includes(creation_type)) {
    return Response.json({ error: '无效的创作类型' }, { status: 400 })
  }
  if (!validSubjects.includes(subject)) {
    return Response.json({ error: '无效的学科' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creations')
    .insert({
      child_id: user.id,
      creation_type,
      title,
      subject,
      cover_emoji: cover_emoji || '📖',
      conversation_id: conversation_id || null,
      content: {},
    })
    .select()
    .single()

  if (error) {
    console.error('Creation insert error:', error)
    return Response.json({ error: '创建失败' }, { status: 500 })
  }

  return Response.json({ creation: data }, { status: 201 })
}
