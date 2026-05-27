'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { createClient, getClientUser } from '@/lib/supabase/client'
import type { LearningRecommendation } from '@/types'

interface StudyPlan {
  id: string
  child_id: string
  title: string
  daily_goal: Record<string, unknown>
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

interface ContentSchedule {
  id: string
  goal_id: string
  material_id: string | null
  schedule_type: 'daily' | 'weekly' | 'ai_recommended' | 'external'
  plan_date: string
  status: 'pending' | 'completed' | 'skipped'
  created_at: string
  learning_goals?: { title: string; subject: string } | null
  materials?: { title: string } | null
}

interface DaySchedule {
  date: string
  dayLabel: string
  weekday: string
  items: ContentSchedule[]
  isToday: boolean
  isPast: boolean
}

/** 本地日历日期 YYYY-MM-DD（避免 toISOString UTC 偏移） */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function PlansPage() {
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null)
  const [weekSchedules, setWeekSchedules] = useState<DaySchedule[]>([])
  const [weekLabel, setWeekLabel] = useState('')
  // Phase 4: AI 推荐任务
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([])

  useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient()
      const user = await getClientUser()
      if (!user) { setLoading(false); return }

      // 定位孩子 ID
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

      // Fetch active study plan for this child
      const { data: plans } = await supabase
        .from('study_plans')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        setActivePlan(plans[0])
      }

      // Scope schedules to goals linked to this parent's materials
      const { data: parentMaterials } = await supabase
        .from('materials')
        .select('id, goal_id')
        .eq('created_by', user.id)

      const scopedGoalIds = [
        ...new Set(
          ((parentMaterials || []) as { goal_id: string | null }[])
            .map((m) => m.goal_id)
            .filter((id): id is string => Boolean(id))
        ),
      ]

      // Calculate current week range (Monday to Sunday)
      const now = new Date()
      const todayStr = formatLocalDate(now)
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + mondayOffset)

      const days: DaySchedule[] = []
      const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = formatLocalDate(d)
        days.push({
          date: dateStr,
          dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
          weekday: weekdayNames[d.getDay()],
          items: [],
          isToday: dateStr === todayStr,
          isPast: dateStr < todayStr,
        })
      }

      // Fetch content schedules for this week (family-scoped)
      const startDate = days[0].date
      const endDate = days[6].date

      let schedules: ContentSchedule[] | null = null
      if (scopedGoalIds.length > 0) {
        const { data } = await supabase
          .from('content_schedules')
          .select('*, learning_goals(title, subject), materials(title)')
          .in('goal_id', scopedGoalIds)
          .gte('plan_date', startDate)
          .lte('plan_date', endDate)
          .order('plan_date', { ascending: true })
        schedules = data
      }

      if (schedules && schedules.length > 0) {
        for (const s of schedules) {
          const dayEntry = days.find((d) => d.date === s.plan_date)
          if (dayEntry) {
            dayEntry.items.push(s)
          }
        }
      }

      setWeekSchedules(days)

      // Calculate week number
      if (plans && plans.length > 0) {
        const planStart = new Date(plans[0].start_date)
        const weekNum = Math.floor((now.getTime() - planStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        setWeekLabel(`第 ${weekNum} 周`)
      } else {
        const month = now.getMonth() + 1
        const weekOfMonth = Math.ceil(now.getDate() / 7)
        setWeekLabel(`${month}月第${weekOfMonth}周`)
      }

      // Phase 4: 获取 AI 推荐
      try {
        const recRes = await fetch(`/api/recommendations?child_id=${childId}`)
        if (recRes.ok) {
          const recData = await recRes.json()
          setRecommendations(recData.recommendations || [])
        }
      } catch { /* AI 推荐获取失败不影响主流程 */ }

      setLoading(false)
    }

    fetchPlans()
  }, [])

  const scheduleTypeLabels: Record<string, string> = {
    daily: '每日',
    weekly: '每周',
    ai_recommended: 'AI推荐',
    external: '外部',
  }

  const subjectIcons: Record<string, string> = {
    chinese: '📖',
    math: '🔢',
    english: '🔤',
  }

  // 本周总完成率
  const totalTasks = weekSchedules.reduce((s, d) => s + d.items.length, 0)
  const completedTasks = weekSchedules.reduce((s, d) => s + d.items.filter(i => i.status === 'completed').length, 0)
  const weekCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // 导航头组件
  const navHeader = (
    <div className="card rounded-soft p-4 mb-8">
      <div className="flex items-center justify-between content-z">
        <BackIconLink href="/parent" label="返回家长中心" />
        <div className="text-center">
          <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📅 学习计划</h1>
          <p className="text-xs" style={{ color: '#8B7355' }}>计划安排 + AI 推荐</p>
        </div>
        <div className="w-10" />
      </div>
    </div>
  )

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          {navHeader}
          <div className="text-center py-20" style={{ color: '#8B7355' }}>加载中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8">
        {navHeader}

        {/* 当前计划信息 + 本周统计 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter">
          <div className="content-z">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>
                📋 {activePlan?.title || '本周学习'}
              </h2>
              {activePlan && (
                <span className="px-3 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  color: '#16a34a',
                }}>
                  进行中
                </span>
              )}
            </div>
            <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
              {activePlan ? `${activePlan.start_date} ~ ${activePlan.end_date} · ${weekLabel}` : weekLabel}
            </p>
            {/* 本周完成概览 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.06)' }}>
                <div className="text-xl font-bold" style={{ color: '#FFB300' }}>{totalTasks}</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>总任务</div>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}>
                <div className="text-xl font-bold" style={{ color: '#16a34a' }}>{completedTasks}</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>已完成</div>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                <div className="text-xl font-bold" style={{ color: '#3A2E2C' }}>{weekCompletionRate}%</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>完成率</div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 4: AI 推荐任务 */}
        {recommendations.length > 0 && (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ borderLeft: '4px solid #FFB300' }}>
            <div className="content-z">
              <h3 className="text-base font-bold mb-3" style={{ color: '#3A2E2C' }}>
                🧠 AI 推荐补充任务
              </h3>
              <p className="text-xs mb-3" style={{ color: '#8B7355' }}>
                基于知识图谱分析，以下知识点建议加入学习计划
              </p>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.05)' }}>
                    <span className="text-lg">{subjectIcons[rec.subject] || '📘'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>{rec.knowledge_point}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: '#8B7355' }}>
                          掌握 {rec.current_mastery}% → 目标 {rec.target_mastery}%
                        </span>
                        <span className="text-xs" style={{ color: '#d97706' }}>
                          ≈{rec.estimated_minutes}分钟
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#8B7355' }}>{rec.reason}</p>
                    </div>
                    <Link
                      href={`/child/chat?mode=${encodeURIComponent(rec.suggested_mode)}&subject=${encodeURIComponent(rec.subject)}&topic=${encodeURIComponent(rec.knowledge_point)}`}
                      className="text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap"
                      style={{ backgroundColor: 'rgba(255,179,0,0.15)', color: '#d97706' }}
                    >
                      去学习
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 本周日历视图 */}
        <div className="card rounded-soft p-6 mb-6">
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              🗓️ 本周计划 · {weekLabel}
            </h2>
            <div className="space-y-3">
              {weekSchedules.map((day, index) => {
                const completedCount = day.items.filter((i) => i.status === 'completed').length
                const totalCount = day.items.length
                const allDone = totalCount > 0 && completedCount === totalCount

                return (
                  <div
                    key={day.date}
                    className="p-4 rounded-xl animate-list-enter"
                    style={{
                      '--stagger': `${index * 80}ms`,
                      backgroundColor: day.isToday
                        ? 'rgba(255,179,0,0.08)'
                        : allDone
                          ? 'rgba(34,197,94,0.05)'
                          : 'rgba(255,255,255,0.4)',
                      border: day.isToday
                        ? '1px solid rgba(255,179,0,0.3)'
                        : allDone
                          ? '1px solid rgba(34,197,94,0.2)'
                          : '1px solid rgba(139,115,85,0.1)',
                    } as React.CSSProperties}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: '#3A2E2C' }}>
                          {day.weekday}
                        </span>
                        <span className="text-xs" style={{ color: '#8B7355' }}>
                          {day.dayLabel}
                        </span>
                        {day.isToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            backgroundColor: 'rgba(255,179,0,0.15)',
                            color: '#d97706',
                          }}>
                            今天
                          </span>
                        )}
                      </div>
                      {totalCount > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-full" style={{
                          color: allDone ? '#16a34a' : '#8B7355',
                          backgroundColor: allDone ? 'rgba(34,197,94,0.1)' : 'rgba(255,179,0,0.1)',
                        }}>
                          {completedCount}/{totalCount} 完成
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full" style={{
                          color: '#8B7355',
                          backgroundColor: 'rgba(156,163,175,0.1)',
                        }}>
                          无任务
                        </span>
                      )}
                    </div>
                    {totalCount > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {day.items.map((item) => {
                          const isCompleted = item.status === 'completed'
                          const isSkipped = item.status === 'skipped'
                          const title = item.learning_goals?.title
                            || item.materials?.title
                            || scheduleTypeLabels[item.schedule_type] || '学习任务'
                          const subjectIcon = item.learning_goals?.subject
                            ? (subjectIcons[item.learning_goals.subject] || '')
                            : ''

                          return (
                            <span
                              key={item.id}
                              className="text-sm px-3 py-1 rounded-full"
                              style={{
                                color: isCompleted ? '#16a34a' : isSkipped ? '#9ca3af' : '#5D4E4A',
                                backgroundColor: isCompleted ? 'rgba(34,197,94,0.08)' : isSkipped ? 'rgba(156,163,175,0.08)' : 'rgba(255,255,255,0.5)',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                              }}
                            >
                              {isCompleted ? '✅' : isSkipped ? '⏭️' : '⬜'} {subjectIcon} {title}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: '#8B7355' }}>暂无安排</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 无计划提示 */}
        {!activePlan && totalTasks === 0 && (
          <div className="card rounded-soft p-8">
            <div className="content-z text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="mb-2" style={{ color: '#3A2E2C' }}>暂无活跃的学习计划</p>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                {recommendations.length > 0
                  ? '可以参考上方 AI 推荐的知识点开始学习'
                  : '请先创建学习计划以安排每日任务'}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
