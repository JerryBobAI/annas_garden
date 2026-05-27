'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { StickyHeader } from '@/components/shared/sticky-header'
import { createClient, getClientUser } from '@/lib/supabase/client'

interface Achievement {
  id: string
  icon: string
  name: string
  description: string
  unlocked: boolean
  progress: number
  target: number
}

interface LearningRecordRow {
  is_correct: boolean
  created_at: string
  duration: number | null
  material_id: string | null
}

interface WrongAnswerRow {
  exercise_id: string
  mastered: boolean
  wrong_count: number
}

interface MaterialRow {
  id: string
  subject: string
}

export default function AchievementsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [unlockedCount, setUnlockedCount] = useState(0)

  const fetchAchievements = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getClientUser()
      if (!user) { setLoading(false); return }

      const [recordsRes, wrongRes] = await Promise.all([
        supabase.from('learning_records')
          .select('is_correct, created_at, duration, material_id')
          .eq('child_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('wrong_answers')
          .select('exercise_id, mastered, wrong_count')
          .eq('child_id', user.id)
      ])

      const allRecords = (recordsRes.data || []) as LearningRecordRow[]
      const wrongAnswersData = (wrongRes.data || []) as WrongAnswerRow[]

      const totalCount = allRecords.length
      const totalCorrect = allRecords.filter(r => r.is_correct).length
      const totalMastered = wrongAnswersData.filter(w => w.mastered).length

      // Streak
      let streakDays = 0
      if (allRecords.length > 0) {
        const dates = [...new Set(allRecords.map(r => new Date(r.created_at).toDateString()))]
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          if (dates.includes(checkDate.toDateString())) {
            streakDays++
          } else {
            if (i === 0) continue
            break
          }
        }
      }

      // Max consecutive correct
      let maxConsecutive = 0
      let currentConsecutive = 0
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

      // Subject mastery check
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, subject')
        .eq('status', 'approved')

      const materialsMap = new Map(
        ((materialsData || []) as MaterialRow[]).map(m => [m.id, m])
      )
      const subjectCorrect: Record<string, number> = {}
      const subjectTotal: Record<string, number> = {}
      for (const record of allRecords) {
        const mat = record.material_id ? materialsMap.get(record.material_id) : undefined
        if (!mat) continue
        subjectTotal[mat.subject] = (subjectTotal[mat.subject] || 0) + 1
        if (record.is_correct) subjectCorrect[mat.subject] = (subjectCorrect[mat.subject] || 0) + 1
      }

      const subjectCount = Object.keys(subjectTotal).length
      const allAbove60 = Object.entries(subjectTotal).every(
        ([subj, total]) => total > 0 && ((subjectCorrect[subj] || 0) / total) >= 0.6
      )

      // Unit done check
      const unitDone = (() => {
        const matCorrect: Record<string, number> = {}
        const matTotal: Record<string, number> = {}
        for (const record of allRecords) {
          if (!record.material_id) continue
          matTotal[record.material_id] = (matTotal[record.material_id] || 0) + 1
          if (record.is_correct) matCorrect[record.material_id] = (matCorrect[record.material_id] || 0) + 1
        }
        return Object.entries(matTotal).some(
          ([id, total]) => total > 0 && ((matCorrect[id] || 0) / total) >= 0.8
        )
      })()

      const list: Achievement[] = [
        { id: 'first_learn', icon: '🌟', name: '首次学习', description: '完成第一道练习题', unlocked: totalCount > 0, progress: Math.min(totalCount, 1), target: 1 },
        { id: 'streak_3', icon: '🔥', name: '连续3天', description: '连续学习3天', unlocked: streakDays >= 3, progress: Math.min(streakDays, 3), target: 3 },
        { id: 'perfect', icon: '💯', name: '满分练习', description: '连续答对5题', unlocked: maxConsecutive >= 5, progress: Math.min(maxConsecutive, 5), target: 5 },
        { id: 'unit_done', icon: '📚', name: '完成单元', description: '掌握一个练习单元', unlocked: unitDone, progress: unitDone ? 1 : 0, target: 1 },
        { id: 'expert', icon: '🎯', name: '达标高手', description: '累计答对50题', unlocked: totalCorrect >= 50, progress: Math.min(totalCorrect, 50), target: 50 },
        { id: 'streak_7', icon: '🌻', name: '连续7天', description: '连续学习7天', unlocked: streakDays >= 7, progress: Math.min(streakDays, 7), target: 7 },
        { id: 'ex100', icon: '🎨', name: '百题斩', description: '累计答对100题', unlocked: totalCorrect >= 100, progress: Math.min(totalCorrect, 100), target: 100 },
        { id: 'master10', icon: '🏆', name: '错题克星', description: '掌握10道错题', unlocked: totalMastered >= 10, progress: Math.min(totalMastered, 10), target: 10 },
        { id: 'master', icon: '🎪', name: '全科学霸', description: '所有学科正确率≥60%', unlocked: subjectCount >= 3 && allAbove60, progress: subjectCount >= 3 && allAbove60 ? 1 : 0, target: 1 },
      ]

      setAchievements(list)
      setUnlockedCount(list.filter(a => a.unlocked).length)
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(fetchAchievements)
  }, [fetchAchievements])

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-lg" style={{ color: '#8B7355' }}>加载成就中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg pb-24">
      <StickyHeader
        subtitle="成就徽章"
        title="🏆 我的成就"
        right={<span className="text-base font-bold" style={{ color: '#FFB300' }}>{unlockedCount}/{achievements.length}</span>}
      />

      {/* 总进度 */}
      <div className="container mx-auto px-4 mb-6">
        <div className="card rounded-soft p-4 text-center animate-card-enter">
          <div className="flex items-center justify-center gap-3">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#FFB300' }}>
                {unlockedCount} / {achievements.length}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                已解锁成就
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 成就列表 */}
      <div className="container mx-auto px-4">
        <div className="space-y-4">
          {achievements.map((badge, index) => (
            <div
              key={badge.id}
              className={`card rounded-soft p-5 animate-list-enter ${!badge.unlocked ? 'opacity-50' : ''}`}
              style={{ '--stagger': `${index * 60}ms` } as React.CSSProperties}
            >
              <div className="flex items-center gap-4">
                <div className={`text-4xl ${badge.unlocked ? '' : 'grayscale'}`}>
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg" style={{ color: badge.unlocked ? '#3A2E2C' : '#8B7355' }}>
                    {badge.name}
                  </div>
                  <div className="text-sm" style={{ color: '#8B7355' }}>
                    {badge.description}
                  </div>
                  {/* 进度条 */}
                  {badge.target > 1 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1" style={{ color: '#8B7355' }}>
                        <span>{badge.progress}/{badge.target}</span>
                        <span>{Math.round((badge.progress / badge.target) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(58, 46, 44, 0.1)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(badge.progress / badge.target) * 100}%`,
                            backgroundColor: badge.unlocked ? '#7CB342' : '#FFB300'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {badge.unlocked && (
                  <div className="text-2xl">✅</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部导航栏由 layout.tsx BottomNav 统一提供 */}
    </main>
  )
}
