/**
 * 复习调度 API
 * GET /api/review/schedule?subject=math
 *
 * 返回基于艾宾浩斯遗忘曲线的复习计划
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReviewSchedule } from '@/lib/engine/spaced-repetition'
import type { KnowledgeMastery, Subject } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // 可选学科筛选
  const subject = request.nextUrl.searchParams.get('subject') as Subject | null

  // 单账号模型：childId 就是当前用户
  const childId = user.id

  // 获取所有掌握度数据
  const { data: masteryData, error } = await supabase
    .from('knowledge_mastery')
    .select('*')
    .eq('child_id', childId)

  if (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }

  const schedule = getReviewSchedule(
    (masteryData || []) as KnowledgeMastery[],
    subject || undefined
  )

  return NextResponse.json(schedule)
}
