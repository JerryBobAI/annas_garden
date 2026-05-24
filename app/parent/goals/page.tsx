'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Semester {
  id: string
  name: string
  start_date: string
  end_date: string
  grade: string
}

interface LearningGoal {
  id: string
  semester_id: string
  subject: string
  week_number: number
  title: string
  description: string | null
  priority: 'core' | 'important' | 'normal'
  mastery_threshold: number
  created_at: string
}

interface GoalGroup {
  subject: string
  label: string
  icon: string
  goals: LearningGoal[]
}

const subjectMeta: Record<string, { label: string; icon: string }> = {
  chinese: { label: '语文', icon: '📖' },
  math: { label: '数学', icon: '🔢' },
  english: { label: '英语', icon: '🔤' },
}

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  core: { label: '核心', bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  important: { label: '重点', bg: 'rgba(255,179,0,0.15)', text: '#d97706' },
  normal: { label: '一般', bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
}

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState<Semester | null>(null)
  const [goalGroups, setGoalGroups] = useState<GoalGroup[]>([])
  const [weekProgress, setWeekProgress] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [semesterPercent, setSemesterPercent] = useState(0)

  useEffect(() => {
    async function fetchGoals() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // Fetch current semester
      const { data: semesters } = await supabase
        .from('semesters')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)

      if (semesters && semesters.length > 0) {
        const sem = semesters[0]
        setSemester(sem)

        // Calculate week progress
        const start = new Date(sem.start_date)
        const end = new Date(sem.end_date)
        const now = new Date()
        const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        const weekNum = Math.floor(elapsedDays / 7) + 1
        const percent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
        setCurrentWeek(weekNum)
        setSemesterPercent(percent)

        // Calculate how many weeks into the goal period we are
        const totalWeeks = Math.ceil(totalDays / 7)
        setWeekProgress(totalWeeks)

        // Fetch learning goals for this semester
        const { data: goals } = await supabase
          .from('learning_goals')
          .select('*')
          .eq('semester_id', sem.id)
          .order('subject')
          .order('week_number')

        if (goals && goals.length > 0) {
          // Group goals by subject
          const grouped: Record<string, LearningGoal[]> = {}
          for (const g of goals) {
            if (!grouped[g.subject]) grouped[g.subject] = []
            grouped[g.subject].push(g)
          }

          const groups: GoalGroup[] = Object.entries(grouped).map(([subject, goals]) => ({
            subject,
            label: subjectMeta[subject]?.label || subject,
            icon: subjectMeta[subject]?.icon || '📘',
            goals,
          }))
          setGoalGroups(groups)
        }
      }

      setLoading(false)
    }

    fetchGoals()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="card rounded-soft p-4 mb-8">
            <div className="flex items-center justify-between content-z">
              <Link href="/parent" className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0" style={{ color: '#3A2E2C' }}>← 返回</Link>
              <div className="text-center">
                <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>🎯 学期目标</h1>
                <p className="text-xs" style={{ color: '#8B7355' }}>规划学习重点</p>
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
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>🎯 学期目标</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>规划学习重点</p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* 学期信息 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter">
          <div className="content-z">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#3A2E2C' }}>
                📚 {semester?.name || '未设置学期'}
              </h2>
              <span className="px-3 py-1 text-sm rounded-full" style={{
                backgroundColor: semester ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)',
                color: semester ? '#16a34a' : '#6b7280',
              }}>
                {semester ? '进行中' : '未配置'}
              </span>
            </div>
            {semester && (
              <>
                <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
                  {semester.start_date} ~ {semester.end_date} · 第 {currentWeek} 周 / 共 {weekProgress} 周
                </p>
                <div className="w-full bg-progress-track rounded-full h-3">
                  <div className="bg-progress-fill h-3 rounded-full transition-all" style={{ width: `${semesterPercent}%` }} />
                </div>
                <p className="text-xs mt-2 text-right" style={{ color: '#8B7355' }}>学期进度 {semesterPercent}%</p>
              </>
            )}
          </div>
        </div>

        {/* 各学科目标 */}
        {goalGroups.length === 0 ? (
          <div className="card rounded-soft p-8">
            <div className="content-z text-center">
              <p style={{ color: '#8B7355' }}>暂无学期目标数据，请先在学期目标中设定学习目标</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {goalGroups.map((group, index) => {
              // Calculate subject progress: goals with week_number <= currentWeek are "achieved"
              const achievedCount = group.goals.filter((g) => g.week_number <= currentWeek).length
              const progressPercent = group.goals.length > 0
                ? Math.round((achievedCount / group.goals.length) * 100)
                : 0

              return (
                <div key={group.subject} className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': `${index * 100}ms` } as React.CSSProperties}>
                  <div className="content-z">
                    <h3 className="text-lg font-bold mb-3" style={{ color: '#3A2E2C' }}>
                      {group.icon} {group.label}
                    </h3>
                    <div className="w-full bg-progress-track rounded-full h-2 mb-3">
                      <div className="bg-progress-fill h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#8B7355' }}>
                      已达周期 {achievedCount}/{group.goals.length} · 进度 {progressPercent}%
                    </p>
                    <div className="space-y-2">
                      {group.goals.map((goal) => {
                        const isAchieved = goal.week_number <= currentWeek
                        const prio = priorityConfig[goal.priority] || priorityConfig.normal

                        return (
                          <div key={goal.id} className="flex items-start gap-2 text-sm p-2 rounded-xl" style={{
                            backgroundColor: isAchieved ? 'rgba(34,197,94,0.05)' : 'transparent',
                          }}>
                            <span className="mt-0.5">{isAchieved ? '✅' : '⬜'}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span style={{ color: '#3A2E2C' }}>{goal.title}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                  backgroundColor: prio.bg,
                                  color: prio.text,
                                }}>
                                  {prio.label}
                                </span>
                                <span className="text-xs" style={{ color: '#8B7355' }}>
                                  第{goal.week_number}周
                                </span>
                              </div>
                              {goal.description && (
                                <p className="text-xs mt-0.5" style={{ color: '#8B7355' }}>{goal.description}</p>
                              )}
                              <p className="text-xs mt-0.5" style={{ color: '#8B7355' }}>
                                掌握阈值: {goal.mastery_threshold}%
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
