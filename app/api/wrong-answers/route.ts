import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/wrong-answers - 获取错题列表
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const childId = searchParams.get('child_id')
  const mastered = searchParams.get('mastered') === 'true'
  const subject = searchParams.get('subject')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  let query = supabase
    .from('wrong_answers')
    .select('*, exercises(*, materials!inner(subject))')
    .order('last_wrong_at', { ascending: false })

  if (childId) query = query.eq('child_id', childId)
  query = query.eq('mastered', mastered)
  if (subject) query = query.eq('exercises.materials.subject', subject)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/wrong-answers - 记录错题（自动 upsert）
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { child_id, exercise_id } = await request.json()

  // 先查是否已存在
  const { data: existing } = await supabase
    .from('wrong_answers')
    .select('*')
    .eq('child_id', child_id)
    .eq('exercise_id', exercise_id)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('wrong_answers')
      .update({
        wrong_count: existing.wrong_count + 1,
        last_wrong_at: new Date().toISOString(),
        mastered: false,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } else {
    const { data, error } = await supabase
      .from('wrong_answers')
      .insert({ child_id, exercise_id, wrong_count: 1 })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  }
}

// PATCH /api/wrong-answers - 标记已掌握
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, mastered } = await request.json()

  const { data, error } = await supabase
    .from('wrong_answers')
    .update({
      mastered,
      mastered_at: mastered ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
