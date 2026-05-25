import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/garden
 * 获取当前孩子的所有花园植物
 * 可选 query: ?subject=math
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const subject = request.nextUrl.searchParams.get('subject')

  let query = supabase
    .from('garden_plants')
    .select('*')
    .eq('child_id', user.id)
    .order('created_at', { ascending: false })

  if (subject) {
    query = query.eq('subject', subject)
  }

  const { data: plants, error } = await query

  if (error) {
    console.error('Garden fetch error:', error)
    return NextResponse.json({ error: '获取花园数据失败' }, { status: 500 })
  }

  return NextResponse.json({ plants: plants || [] })
}
