'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

export default function PlansPage() {
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null)
  const [weekSchedules, setWeekSchedules] = useState<DaySchedule[]>([])
  const [weekLabel, setWeekLabel] = useState('')

  useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient()

      // Fetch active study plan
      const { data: plans } = await supabase
        .from('study_plans')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        setActivePlan(plans[0])
      }

      // Calculate current week range (Monday to Sunday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + mondayOffset)

      const days: DaySchedule[] = []
      const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        days.push({
          date: dateStr,
          dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
          weekday: weekdayNames[d.getDay()],
          items: [],
          isToday: dateStr === now.toISOString().split('T')[0],
          isPast: d < new Date(now.toISOString().split('T')[0]),
        })
      }

      // Fetch content schedules for this week
      const startDate = days[0].date
      const endDate = days[6].date

      const { data: schedules } = await supabase
        .from('content_schedules')
        .select('*, learning_goals(title, subject), materials(title)')
        .gte('plan_date', startDate)
        .lte('plan_date', endDate)
        .order('plan_date', { ascending: true })

      if (schedules && schedules.length > 0) {
        for (const s of schedules) {
          const dayEntry = days.find((d) => d.date === s.plan_date)
          if (dayEntry) {
            dayEntry.items.push(s)
          }
        }
      }

      setWeekSchedules(days)

      // Calculate week number from active plan or just use date-based label
      if (plans && plans.length > 0) {
        const planStart = new Date(plans[0].start_date)
        const weekNum = Math.floor((now.getTime() - planStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        setWeekLabel(`第 ${weekNum} 周`)
      } else {
        const month = now.getMonth() + 1
        const weekOfMonth = Math.ceil(now.getDate() / 7)
        setWeekLabel(`${month}月第${weekOfMonth}周`)
      }

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

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="card rounded-soft p-4 mb-8">
            <div className="flex items-center justify-between content-z">
              <Link href="/parent" className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0" style={{ color: '#3A2E2C' }}>← 返回</Link>
              <div className="text-center">
                <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📅 学习计划</h1>
                <p className="text-xs" style={{ color: '#8B7355' }}>安排每日任务</p>
              </div>
              <div className="w-16" />
            </div>
          </div>
          <div className="text-center py-20" style={{ color: '#8B7355' }}>加载中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8">
        {/* 导航 */}
        <div className="card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between content-z">
            <Link href="/parent" className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0" style={{ color: '#3A2E2C' }}>← 返回</Link>
            <div className="text-center">
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📅 学习计划</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>安排每日任务</p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* 当前计划信息 */}
        {activePlan && (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter">
            <div className="content-z">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>
                  📋 {activePlan.title}
                </h2>
                <span className="px-3 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  color: '#16a34a',
                }}>
                  进行中
                </span>
              </div>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                {activePlan.start_date} ~ {activePlan.end_date} · {weekLabel}
              </p>
            </div>
          </div>
        )}

        {/* 本周计划 */}
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
        {!activePlan && (
          <div className="card rounded-soft p-8">
            <div className="content-z text-center">
              <p className="mb-2" style={{ color: '#3A2E2C' }}>暂无活跃的学习计划</p>
              <p className="text-sm" style={{ color: '#8B7355' }}>请先创建学习计划以安排每日任务</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
