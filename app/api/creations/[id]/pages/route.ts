import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/creations/[id]/pages — 获取创作所有页面
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

  const { data: pages, error } = await supabase
    .from('creation_pages')
    .select('*')
    .eq('creation_id', id)
    .order('page_number', { ascending: true })

  if (error) {
    console.error('Pages query error:', error)
    return Response.json({ error: '获取页面失败' }, { status: 500 })
  }

  return Response.json({ pages: pages || [] })
}

/**
 * POST /api/creations/[id]/pages — 添加新页面
 * Body: { page_number, author, content, illustration_prompt?, knowledge_tags? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: {
    page_number: number
    author: string
    content: string
    illustration_prompt?: string
    knowledge_tags?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { page_number, author, content, illustration_prompt, knowledge_tags } = body

  if (!page_number || !author || !content) {
    return Response.json({ error: '缺少必要字段' }, { status: 400 })
  }

  const validAuthors = ['child', 'fairy', 'both']
  if (!validAuthors.includes(author)) {
    return Response.json({ error: '无效的作者类型' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creation_pages')
    .insert({
      creation_id: id,
      page_number,
      author,
      content,
      illustration_prompt: illustration_prompt || null,
      knowledge_tags: knowledge_tags || [],
    })
    .select()
    .single()

  if (error) {
    console.error('Page insert error:', error)
    return Response.json({ error: '添加页面失败' }, { status: 500 })
  }

  return Response.json({ page: data }, { status: 201 })
}
