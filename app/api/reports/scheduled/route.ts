/**
 * 定时报告生成 API
 *
 * GET /api/reports/scheduled
 * → 检查当前用户是否需要新报告
 * → 如果需要，自动调用报告生成
 *
 * POST /api/reports/scheduled
 * → Vercel Cron 调用：为所有活跃孩子检查并生成报告
 * → 需要 CRON_SECRET 认证
 */

import { createClient } from '@/lib/supabase/server'
import { checkReportSchedule } from '@/lib/engine/report-scheduler'

/**
 * GET — 当前用户的报告调度检查
 * 家长面板加载时调用，按需触发报告生成
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  // 单账号模型：直接用当前用户 ID
  const childIds = [user.id]

  const results = []

  for (const childId of childIds) {
    // 查最近的报告
    const { data: lastReport } = await supabase
      .from('learning_reports')
      .select('created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const schedule = checkReportSchedule(lastReport?.created_at || null)

    results.push({
      child_id: childId,
      ...schedule,
    })
  }

  // 如果有需要生成的报告，自动触发生成（取第一个需要生成的）
  const needGenerate = results.find(r => r.shouldGenerate)
  if (needGenerate) {
    // 调用报告生成 API（内部调用，不需要额外认证）
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const generateRes = await fetch(`${origin}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: needGenerate.child_id,
          type: needGenerate.reportType,
          period_start: needGenerate.periodStart,
          period_end: needGenerate.periodEnd,
        }),
      })

      if (generateRes.ok) {
        const report = await generateRes.json()
        return Response.json({
          generated: true,
          report,
          schedule: results,
        })
      }
    } catch (err) {
      console.error('Auto report generation failed:', err)
    }
  }

  return Response.json({
    generated: false,
    schedule: results,
  })
}

/**
 * POST — Cron 批量调度
 * 配置在 vercel.json 中，每周一早上 8:00 执行
 */
export async function POST(req: Request) {
  // 验证 Cron Secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: '无权限' }, { status: 401 })
  }

  const supabase = await createClient()

  // 查询所有有活跃对话的孩子（最近 30 天内有对话）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: activeChildren } = await supabase
    .from('conversations')
    .select('child_id')
    .gte('started_at', thirtyDaysAgo.toISOString())

  // 去重
  const uniqueChildIds = [...new Set((activeChildren || []).map(c => c.child_id))]

  const results = []

  for (const childId of uniqueChildIds) {
    // 检查是否需要生成
    const { data: lastReport } = await supabase
      .from('learning_reports')
      .select('created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const schedule = checkReportSchedule(lastReport?.created_at || null)

    if (schedule.shouldGenerate) {
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const res = await fetch(`${origin}/api/reports/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: childId,
            type: schedule.reportType,
            period_start: schedule.periodStart,
            period_end: schedule.periodEnd,
          }),
        })

        results.push({
          child_id: childId,
          success: res.ok,
          type: schedule.reportType,
          reason: schedule.reason,
        })
      } catch (err) {
        results.push({
          child_id: childId,
          success: false,
          error: String(err),
        })
      }
    }
  }

  return Response.json({
    processed: uniqueChildIds.length,
    generated: results.filter(r => r.success).length,
    results,
  })
}
