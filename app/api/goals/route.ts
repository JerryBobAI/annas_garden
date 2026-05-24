import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/goals - 获取学习目标
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const semesterId = searchParams.get('semester_id')
  const subject = searchParams.get('subject')

  // 获取当前学期
  if (!semesterId) {
    const { data: semester } = await supabase
      .from('semesters')
      .select('*')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .single()

    if (semester) {
      const goals = await fetchGoals(supabase, semester.id, subject)
      return NextResponse.json({ data: goals, semester })
    }
  }

  const data = await fetchGoals(supabase, semesterId, subject)
  return NextResponse.json({ data })
}

async function fetchGoals(supabase: any, semesterId: string | null, subject: string | null) {
  let query = supabase
    .from('learning_goals')
    .select('*')
    .order('week_number', { ascending: true })

  if (semesterId) query = query.eq('semester_id', semesterId)
  if (subject) query = query.eq('subject', subject)

  const { data, error } = await query
  if (error) throw error
  return data
}
