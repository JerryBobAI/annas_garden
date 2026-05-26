/**
 * 学习报告 API
 *
 * GET /api/reports?child_id=xxx&type=weekly&limit=4
 * → 返回报告列表
 *
 * GET /api/reports?id=xxx
 * → 返回单份报告详情
 */

import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('id')

  // 单份报告详情
  if (reportId) {
    const { data: report, error } = await supabase
      .from('learning_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error) {
      return Response.json({ error: '报告不存在' }, { status: 404 })
    }

    return Response.json(report)
  }

  // 报告列表
  const childId = searchParams.get('child_id') || user.id
  const reportType = searchParams.get('type') // weekly / monthly / milestone
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    let query = supabase
      .from('learning_reports')
      .select('*')
      .eq('child_id', childId)
      .order('period_end', { ascending: false })
      .limit(limit)

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    const { data: reports, error } = await query

    if (error) throw error

    return Response.json({
      reports: reports || [],
      total: reports?.length || 0,
    })
  } catch (err) {
    console.error('Reports API error:', err)
    return Response.json({ error: '获取报告失败' }, { status: 500 })
  }
}
