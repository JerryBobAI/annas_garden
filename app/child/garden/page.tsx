'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StickyHeader } from '@/components/shared/sticky-header'

interface SubjectMastery {
  subject: string
  mastery: number
  materials: { title: string; mastery: number; status: 'mastered' | 'in_progress' | 'locked' }[]
}

interface Achievement {
  id: string
  icon: string
  name: string
  unlocked: boolean
}

const subjectConfig: Record<string, { icon: string; name: string; color: string }> = {
  math: { icon: '🔢', name: '数学', color: '#FFB300' },
  chinese: { icon: '📖', name: '语文', color: '#87CEEB' },
  english: { icon: '🔤', name: '英语', color: '#556B2F' }
}

export default function GardenPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [streakDays, setStreakDays] = useState(0)
  const [subjectMasteries, setSubjectMasteries] = useState<SubjectMastery[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [calendarDays, setCalendarDays] = useState<{ day: number; active: boolean }[]>([])
  const [totalExercises, setTotalExercises] = useState(0)
  const [currentMonth, setCurrentMonth] = useState('')

  const fetchGardenData = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      setCurrentMonth(`${now.getFullYear()}年${now.getMonth() + 1}月`)

      // Fetch all learning records for current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: allRecords } = await supabase
        .from('learning_records')
        .select('id, material_id, exercise_id, is_correct, created_at, duration')
        .eq('child_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch materials for subject grouping
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, subject, title')
        .eq('status', 'approved')

      // Fetch wrong answers for mastery info
      const { data: wrongAnswersData } = await supabase
        .from('wrong_answers')
        .select('exercise_id, mastered, wrong_count')
        .eq('child_id', user.id)

      const totalExCount = allRecords?.length || 0
      setTotalExercises(totalExCount)

      // Calculate streak
      let streak = 0
      if (allRecords && allRecords.length > 0) {
        const dates = [...new Set(
          allRecords.map(r => new Date(r.created_at).toDateString())
        )]
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          if (dates.includes(checkDate.toDateString())) {
            streak++
          } else {
            if (i === 0) continue
            break
          }
        }
        setStreakDays(streak)
      }

      // Build calendar for current month
      const year = now.getFullYear()
      const month = now.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const activeDates = new Set(
        (allRecords || [])
          .filter(r => {
            const d = new Date(r.created_at)
            return d.getFullYear() === year && d.getMonth() === month
          })
          .map(r => new Date(r.created_at).getDate())
      )
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        active: activeDates.has(i + 1)
      }))
      setCalendarDays(days)

      // Calculate subject mastery
      const materialsMap = new Map((materialsData || []).map(m => [m.id, m]))
      const subjectRecords: Record<string, { correct: number; total: number; materials: Record<string, { title: string; correct: number; total: number }> }> = {}

      for (const record of (allRecords || [])) {
        const mat = materialsMap.get(record.material_id)
        if (!mat) continue
        if (!subjectRecords[mat.subject]) {
          subjectRecords[mat.subject] = { correct: 0, total: 0, materials: {} }
        }
        const sr = subjectRecords[mat.subject]
        sr.total++
        if (record.is_correct) sr.correct++

        if (!sr.materials[mat.id]) {
          sr.materials[mat.id] = { title: mat.title, correct: 0, total: 0 }
        }
        sr.materials[mat.id].total++
        if (record.is_correct) sr.materials[mat.id].correct++
      }

      const masteries: SubjectMastery[] = Object.entries(subjectRecords).map(([subject, data]) => ({
        subject,
        mastery: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        materials: Object.values(data.materials).map(m => {
          const matMastery = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0
          return {
            title: m.title,
            mastery: matMastery,
            status: (matMastery >= 80 ? 'mastered' : m.total > 0 ? 'in_progress' : 'locked') as 'mastered' | 'in_progress' | 'locked'
          }
        })
      }))
      setSubjectMasteries(masteries)

      // Calculate achievements
      const totalCorrect = (allRecords || []).filter(r => r.is_correct).length
      const totalMastered = wrongAnswersData?.filter(w => w.mastered).length || 0

      // Check for consecutive correct answers
      let maxConsecutive = 0
      let currentConsecutive = 0
      if (allRecords) {
        // Sort by created_at ascending for streak check
        const sorted = [...allRecords].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        for (const r of sorted) {
          if (r.is_correct) {
            currentConsecutive++
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
          } else {
            currentConsecutive = 0
          }
        }
      }

      const badgeList: Achievement[] = [
        { id: 'first_learn', icon: '🌟', name: '首次学习', unlocked: totalExCount > 0 },
        { id: 'streak_3', icon: '🔥', name: '连续3天', unlocked: streak >= 3 },
        { id: 'perfect', icon: '💯', name: '满分练习', unlocked: maxConsecutive >= 5 },
        { id: 'unit_done', icon: '📚', name: '完成单元', unlocked: masteries.some(m => m.materials.some(mat => mat.status === 'mastered')) },
        { id: 'expert', icon: '🎯', name: '达标高手', unlocked: totalCorrect >= 50 },
        { id: 'streak_7', icon: '🌻', name: '连续7天', unlocked: streak >= 7 },
        { id: 'ex100', icon: '🎨', name: '百题斩', unlocked: totalCorrect >= 100 },
        { id: 'master10', icon: '🏆', name: '错题克星', unlocked: totalMastered >= 10 },
        { id: 'master', icon: '🎪', name: '全科学霸', unlocked: masteries.length >= 3 && masteries.every(m => m.mastery >= 60) }
      ]
      setAchievements(badgeList)
    } catch (error) {
      console.error('Error fetching garden data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(fetchGardenData)
  }, [fetchGardenData])

  const statusIcons: Record<string, { icon: string; bgColor: string }> = {
    mastered: { icon: '✓', bgColor: 'rgba(124, 179, 66, 0.2)' },
    in_progress: { icon: '🌱', bgColor: 'rgba(255, 179, 0, 0.2)' },
    locked: { icon: '🌰', bgColor: 'rgba(58, 46, 44, 0.05)' }
  }

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌻</div>
          <div className="text-lg" style={{ color: '#8B7355' }}>加载花园中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg pb-24">
      <StickyHeader
        subtitle="成长记录"
        title="🏡 我的花园"
        right={<span className="text-xl">🌻</span>}
      />

      {/* 花园主区域 */}
      <div className="container mx-auto px-4 mb-8">
        <div className="card rounded-soft p-8 mb-8 animate-card-enter">
          {/* 学习天数展示 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔥</div>
            <div className="text-5xl font-bold mb-2" style={{ color: '#FFB300' }}>
              {streakDays} 天
            </div>
            <div className="text-lg" style={{ color: '#8B7355' }}>
              连续学习记录
            </div>
            <div className="text-sm mt-2" style={{ color: '#5D4E4A' }}>
              累计练习 {totalExercises} 题
            </div>
          </div>

          {/* 日历热力图 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#3A2E2C' }}>
              {currentMonth}学习日历
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((d) => (
                <div
                  key={d.day}
                  className="aspect-square rounded-soft flex items-center justify-center text-sm font-semibold"
                  style={{
                    backgroundColor: d.active ? 'rgba(124, 179, 66, 0.6)' : 'rgba(58, 46, 44, 0.05)',
                    color: d.active ? '#fff' : '#8B7355'
                  }}
                >
                  {d.day}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm" style={{ color: '#8B7355' }}>
              <span>少</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(58, 46, 44, 0.05)' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(124, 179, 66, 0.3)' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(124, 179, 66, 0.6)' }} />
              </div>
              <span>多</span>
            </div>
          </div>
        </div>

        {/* 知识点树 */}
        <div className="card rounded-soft p-6 mb-8 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#3A2E2C' }}>
            🌳 知识树
          </h2>

          {subjectMasteries.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#8B7355' }}>
              开始练习后，知识树会在这里生长哦
            </div>
          ) : (
            subjectMasteries.map((subject) => {
              const config = subjectConfig[subject.subject] || { icon: '📝', name: subject.subject, color: '#8B7355' }
              return (
                <div key={subject.subject} className="mb-8 last:mb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">{config.icon}</div>
                    <h3 className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
                      {config.name}
                    </h3>
                    <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgba(58, 46, 44, 0.1)' }}>
                      <div className="h-full rounded-full" style={{ width: `${subject.mastery}%`, backgroundColor: config.color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: config.color }}>
                      {subject.mastery}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 ml-12">
                    {subject.materials.map((mat) => {
                      const status = statusIcons[mat.status]
                      return (
                        <div
                          key={mat.title}
                          className="p-3 rounded-soft flex items-center gap-2"
                          style={{ backgroundColor: status.bgColor }}
                        >
                          <span>{status.icon}</span>
                          <span className="text-sm" style={{ color: mat.status === 'locked' ? '#8B7355' : '#3A2E2C' }}>
                            {mat.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 成就徽章 */}
        <div className="card rounded-soft p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#3A2E2C' }}>
            🏆 成就徽章
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {achievements.map((badge, index) => (
              <div key={badge.id} className={`text-center animate-badge-enter ${!badge.unlocked ? 'opacity-40' : ''}`} style={{ '--stagger': `${index * 50}ms` } as React.CSSProperties}>
                <div className="text-5xl mb-2">{badge.icon}</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>
                  {badge.unlocked ? badge.name : '待解锁'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部导航栏由 layout.tsx BottomNav 统一提供 */}
    </main>
  )
}
