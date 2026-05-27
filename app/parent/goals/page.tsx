/**
 * 学期目标页面 — Server Component
 *
 * 服务端预取学期、目标、掌握度数据
 * 交互（展开/收起）委托给 GoalsClient
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GoalsClient from '@/components/parent/goals-client'
import type { GoalGroup, SemesterInfo } from '@/components/parent/goals-client'

const subjectMeta: Record<string, { label: string; icon: string }> = {
  chinese: { label: '语文', icon: '📖' },
  math: { label: '数学', icon: '🔢' },
  english: { label: '英语', icon: '🔤' },
}

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // 1. 定位孩子 ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let childId = user.id
  if (profile?.role === 'parent') {
    const { data: children } = await supabase
      .from('profiles')
      .select('id')
      .eq('parent_id', user.id)
      .eq('role', 'child')
      .limit(1)
    if (children?.[0]) childId = children[0].id
  }

  // 2. 查询当前学期
  const today = new Date().toISOString().split('T')[0]
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)

  let semester: SemesterInfo | null = null
  let goalGroups: GoalGroup[] = []
  let currentWeek = 0
  let weekProgress = 0
  let semesterPercent = 0

  if (semesters && semesters.length > 0) {
    const sem = semesters[0]
    semester = sem

    // 计算周进度
    const start = new Date(sem.start_date)
    const end = new Date(sem.end_date)
    const now = new Date()
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    currentWeek = Math.floor(elapsedDays / 7) + 1
    semesterPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
    weekProgress = Math.ceil(totalDays / 7)

    // 3. 并行获取目标 + 掌握度
    const [goalsRes, masteryRes] = await Promise.all([
      supabase
        .from('learning_goals')
        .select('*')
        .eq('semester_id', sem.id)
        .order('subject')
        .order('week_number'),
      supabase
        .from('knowledge_mastery')
        .select('subject, knowledge_point, mastery_level')
        .eq('child_id', childId),
    ])

    const goals = goalsRes.data || []
    const mastery = (masteryRes.data || []) as { subject: string; knowledge_point: string; mastery_level: number }[]

    if (goals.length > 0) {
      const grouped: Record<string, typeof goals> = {}
      for (const g of goals) {
        if (!grouped[g.subject]) grouped[g.subject] = []
        grouped[g.subject].push(g)
      }

      goalGroups = Object.entries(grouped).map(([subject, subGoals]) => {
        const subMastery = mastery.filter(m => m.subject === subject)
        const avgMastery = subMastery.length > 0
          ? Math.round(subMastery.reduce((s, m) => s + m.mastery_level, 0) / subMastery.length)
          : 0
        return {
          subject,
          label: subjectMeta[subject]?.label || subject,
          icon: subjectMeta[subject]?.icon || '📘',
          goals: subGoals,
          avgMastery,
          masteryPoints: subMastery,
        }
      })
    }
  }

  return (
    <GoalsClient
      semester={semester}
      goalGroups={goalGroups}
      currentWeek={currentWeek}
      weekProgress={weekProgress}
      semesterPercent={semesterPercent}
    />
  )
}
