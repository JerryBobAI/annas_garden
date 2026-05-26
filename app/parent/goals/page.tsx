'use client'

import { useEffect, useState } from 'react'
import { BackIconLink } from '@/components/shared/back-icon-link'
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

// Phase 4: 知识掌握度数据
interface MasteryRecord {
  subject: string
  knowledge_point: string
  mastery_level: number
}

interface GoalGroup {
  subject: string
  label: string
  icon: string
  goals: LearningGoal[]
  avgMastery: number          // 该学科平均掌握度
  masteryPoints: MasteryRecord[] // 该学科的所有掌握度记录
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

// 掌握度颜色
function masteryColor(level: number): { bg: string; text: string } {
  if (level >= 80) return { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' }
  if (level >= 50) return { bg: 'rgba(255,179,0,0.12)', text: '#d97706' }
  if (level > 0) return { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' }
  return { bg: 'rgba(156,163,175,0.1)', text: '#9ca3af' }
}

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState<Semester | null>(null)
  const [goalGroups, setGoalGroups] = useState<GoalGroup[]>([])
  const [weekProgress, setWeekProgress] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [semesterPercent, setSemesterPercent] = useState(0)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGoals() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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
        const totalWeeks = Math.ceil(totalDays / 7)
        setWeekProgress(totalWeeks)

        // 并行获取目标 + Phase 4 掌握度数据
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
        const mastery = (masteryRes.data || []) as MasteryRecord[]

        if (goals.length > 0) {
          // 按学科分组
          const grouped: Record<string, LearningGoal[]> = {}
          for (const g of goals) {
            if (!grouped[g.subject]) grouped[g.subject] = []
            grouped[g.subject].push(g)
          }

          // 构建 GoalGroup 并注入掌握度
          const groups: GoalGroup[] = Object.entries(grouped).map(([subject, subGoals]) => {
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
          setGoalGroups(groups)
        }
      }

      setLoading(false)
    }

    fetchGoals()
  }, [])

  // 加载和空状态共用的导航头
  const navHeader = (
    <div className="card rounded-soft p-4 mb-8">
      <div className="flex items-center justify-between content-z">
        <BackIconLink href="/parent" label="返回家长中心" />
        <div className="text-center">
          <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>🎯 学期目标</h1>
          <p className="text-xs" style={{ color: '#8B7355' }}>知识图谱掌握追踪</p>
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
              <div className="text-4xl mb-3">📋</div>
              <p className="mb-2" style={{ color: '#3A2E2C' }}>暂无学期目标数据</p>
              <p className="text-sm" style={{ color: '#8B7355' }}>请先在学期目标中设定学习目标</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {goalGroups.map((group, index) => {
              const achievedCount = group.goals.filter((g) => g.week_number <= currentWeek).length
              const progressPercent = group.goals.length > 0
                ? Math.round((achievedCount / group.goals.length) * 100)
                : 0
              const mColor = masteryColor(group.avgMastery)
              const isExpanded = expandedSubject === group.subject

              return (
                <div key={group.subject} className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': `${index * 100}ms` } as React.CSSProperties}>
                  <div className="content-z">
                    {/* 学科头 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>
                        {group.icon} {group.label}
                      </h3>
                      {/* Phase 4: 显示平均掌握度 */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                          backgroundColor: mColor.bg,
                          color: mColor.text,
                        }}>
                          掌握 {group.avgMastery}%
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full bg-progress-track rounded-full h-2 mb-3">
                      <div className="bg-progress-fill h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs mb-4" style={{ color: '#8B7355' }}>
                      已达周期 {achievedCount}/{group.goals.length} · 周期进度 {progressPercent}%
                    </p>

                    {/* 目标列表 */}
                    <div className="space-y-2">
                      {group.goals.map((goal) => {
                        const isAchieved = goal.week_number <= currentWeek
                        const prio = priorityConfig[goal.priority] || priorityConfig.normal
                        // Phase 4: 查找该目标对应的掌握度（标题模糊匹配知识点）
                        const relatedMastery = group.masteryPoints.find(
                          m => goal.title.includes(m.knowledge_point) || m.knowledge_point.includes(goal.title)
                        )
                        const mLevel = relatedMastery?.mastery_level ?? 0
                        const goalMColor = masteryColor(mLevel)
                        const meetThreshold = mLevel >= goal.mastery_threshold

                        return (
                          <div key={goal.id} className="flex items-start gap-2 text-sm p-2.5 rounded-xl" style={{
                            backgroundColor: meetThreshold ? 'rgba(34,197,94,0.05)' : isAchieved ? 'rgba(255,179,0,0.04)' : 'transparent',
                          }}>
                            <span className="mt-0.5">{meetThreshold ? '✅' : isAchieved ? '🔄' : '⬜'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
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
                              {/* Phase 4: 掌握度指示器 */}
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 bg-progress-track rounded-full h-1.5" style={{ maxWidth: '120px' }}>
                                  <div className="h-1.5 rounded-full transition-all" style={{
                                    width: `${mLevel}%`,
                                    backgroundColor: goalMColor.text,
                                  }} />
                                </div>
                                <span className="text-xs" style={{ color: goalMColor.text }}>
                                  {mLevel > 0 ? `${mLevel}%` : '未开始'}
                                </span>
                                <span className="text-xs" style={{ color: '#8B7355' }}>
                                  / 目标 {goal.mastery_threshold}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase 4: 展开查看所有知识点掌握度 */}
                    {group.masteryPoints.length > 0 && (
                      <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(139,115,85,0.1)' }}>
                        <button
                          onClick={() => setExpandedSubject(isExpanded ? null : group.subject)}
                          className="text-xs font-medium"
                          style={{ color: '#FFB300' }}
                        >
                          {isExpanded ? '收起知识掌握详情 ↑' : `查看全部 ${group.masteryPoints.length} 个知识点掌握度 ↓`}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 space-y-1.5">
                            {group.masteryPoints
                              .sort((a, b) => b.mastery_level - a.mastery_level)
                              .map((m) => {
                                const mc = masteryColor(m.mastery_level)
                                return (
                                  <div key={m.knowledge_point} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                                    <span className="flex-1 truncate" style={{ color: '#3A2E2C' }}>{m.knowledge_point}</span>
                                    <div className="w-16 bg-progress-track rounded-full h-1.5">
                                      <div className="h-1.5 rounded-full" style={{
                                        width: `${m.mastery_level}%`,
                                        backgroundColor: mc.text,
                                      }} />
                                    </div>
                                    <span className="text-xs w-10 text-right font-medium" style={{ color: mc.text }}>
                                      {m.mastery_level}%
                                    </span>
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    )}
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
