import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/learning-records - 获取学习记录
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const childId = searchParams.get('child_id')
  const days = parseInt(searchParams.get('days') || '7')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let query = supabase
    .from('learning_records')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (childId) query = query.eq('child_id', childId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 统计
  const stats = {
    total: data.length,
    totalDuration: data.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.duration) || 0), 0),
    correctCount: data.filter((r: Record<string, unknown>) => r.is_correct === true).length,
    practiceCount: data.filter((r: Record<string, unknown>) => r.activity_type === 'practice').length,
  }

  return NextResponse.json({ data, stats })
}

// POST /api/learning-records - 创建学习记录
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { data, error } = await supabase
    .from('learning_records')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
