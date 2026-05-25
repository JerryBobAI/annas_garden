import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/exercises - 获取练习题
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)

  const materialId = searchParams.get('material_id')
  const subject = searchParams.get('subject')
  const difficulty = searchParams.get('difficulty')
  const limit = parseInt(searchParams.get('limit') || '10')

  let query = supabase.from('exercises').select('*, materials!inner(subject)')

  if (materialId) query = query.eq('material_id', materialId)
  if (subject) query = query.eq('materials.subject', subject)
  if (difficulty) query = query.eq('difficulty', difficulty)

  const { data, error } = await query.limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/exercises - 创建练习题
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  const body = await request.json()

  // 输入字段白名单验证
  const { material_id, question, options, correct_answer, difficulty, knowledge_points } = body
  if (!material_id || !question || !correct_answer) {
    return NextResponse.json({ error: '缺少必要字段: material_id, question, correct_answer' }, { status: 400 })
  }
  const validDifficulties = ['easy', 'medium', 'hard']
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return NextResponse.json({ error: '无效的难度值' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('exercises')
    .insert({ material_id, question, options, correct_answer, difficulty: difficulty || 'medium', knowledge_points: knowledge_points || [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
