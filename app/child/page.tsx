'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playNavigate, playTap } from '@/lib/sounds'

interface Material {
  id: string
  subject: string
  title: string
  type: string
}

interface Exercise {
  id: string
  material_id: string
}

interface LearningRecord {
  id: string
  exercise_id: string
  material_id: string
  is_correct: boolean
  created_at: string
}

interface MaterialWithExercises extends Material {
  exercises: Exercise[]
}

const subjectIcons: Record<string, string> = {
  math: '🔢',
  chinese: '📖',
  english: '🔤'
}

const subjectNames: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语'
}

function getGreeting(): { emoji: string; text: string } {
  const hour = new Date().getHours()
  if (hour < 6) return { emoji: '🌙', text: '凌晨好' }
  if (hour < 9) return { emoji: '🌅', text: '早上好' }
  if (hour < 12) return { emoji: '☀️', text: '上午好' }
  if (hour < 14) return { emoji: '🌞', text: '中午好' }
  if (hour < 18) return { emoji: '🌤', text: '下午好' }
  return { emoji: '🌙', text: '晚上好' }
}

function getCurrentWeek(): number {
  const semesterStart = new Date('2026-02-16')
  const now = new Date()
  const diffMs = now.getTime() - semesterStart.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.ceil((diffDays + 1) / 7))
}

export default function ChildHomePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('Anna')
  const [materials, setMaterials] = useState<MaterialWithExercises[]>([])
  const [todayRecords, setTodayRecords] = useState<LearningRecord[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [weekAccuracy, setWeekAccuracy] = useState(0)
  const [weekDuration, setWeekDuration] = useState(0)

  const greeting = getGreeting()
  const currentWeek = getCurrentWeek()

  useEffect(() => {
    fetchChildData()
  }, [])

  async function fetchChildData() {
    setLoading(true)
    try {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser()
      const childId = user?.id

      // Run all independent queries in parallel
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      weekStart.setHours(0, 0, 0, 0)

      const [profileRes, materialsRes, todayRes, weekRes, streakRes] = await Promise.all([
        childId ? supabase.from('profiles').select('display_name').eq('id', childId).single() : Promise.resolve({ data: null }),
        supabase.from('materials').select('id, subject, title, type, exercises (id, material_id)').eq('status', 'approved').eq('type', 'exercise').order('subject'),
        supabase.from('learning_records').select('id, exercise_id, material_id, is_correct, created_at').gte('created_at', today.toISOString()).order('created_at'),
        supabase.from('learning_records').select('is_correct, duration').gte('created_at', weekStart.toISOString()),
        supabase.from('learning_records').select('created_at').order('created_at', { ascending: false }).limit(100),
      ])

      // Process results
      if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name)
      if (materialsRes.data) setMaterials(materialsRes.data as unknown as MaterialWithExercises[])
      if (todayRes.data) setTodayRecords(todayRes.data)

      if (weekRes.data && weekRes.data.length > 0) {
        const correctCount = weekRes.data.filter(r => r.is_correct).length
        setWeekAccuracy(Math.round((correctCount / weekRes.data.length) * 100))
        const totalSeconds = weekRes.data.reduce((sum, r) => sum + (r.duration || 0), 0)
        setWeekDuration(Math.round(totalSeconds / 3600 * 10) / 10)
      }

      // Calculate streak from pre-fetched data
      if (streakRes.data && streakRes.data.length > 0) {
        const dates = [...new Set(streakRes.data.map(r => new Date(r.created_at).toDateString()))]
        let streak = 0
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(todayDate)
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
    } catch (error) {
      console.error('Error fetching child data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group materials by subject
  const materialsBySubject = materials.reduce<Record<string, MaterialWithExercises[]>>((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = []
    acc[m.subject].push(m)
    return acc
  }, {})

  // Calculate today's progress
  const todayMaterialIds = new Set(todayRecords.map(r => r.material_id).filter(Boolean))
  const totalMaterials = materials.length
  const completedMaterials = materials.filter(m => todayMaterialIds.has(m.id)).length
  const progressPercent = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0

  // Count unmastered wrong answers for badge
  const [wrongCount, setWrongCount] = useState(0)
  useEffect(() => {
    async function fetchWrongCount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('wrong_answers')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', user.id)
        .eq('mastered', false)
      setWrongCount(count || 0)
    }
    fetchWrongCount()
  }, [])

  return (
    <main className="min-h-screen watercolor-bg pb-24">
      {/* 顶部欢迎区 */}
      <div className="container mx-auto px-4 pt-8 pb-6">
        <div className="card rounded-soft p-6 animate-card-enter">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm mb-1" style={{ color: '#8B7355' }}>
                {greeting.emoji} {greeting.text}
              </p>
              <h1 className="text-3xl font-bold" style={{ color: '#3A2E2C' }}>
                {displayName}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-1">🌻</div>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                第{currentWeek}周
              </p>
            </div>
          </div>

          {/* 今日目标进度 */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2" style={{ color: '#5D4E4A' }}>
              <span>今日学习目标</span>
              <span>{completedMaterials}/{totalMaterials} 完成</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(58, 46, 44, 0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #FFB300 0%, #FFA000 100%)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 今日任务卡片 */}
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
          📝 今日任务
        </h2>
        {loading ? (
          <div className="card rounded-soft p-8 text-center">
            <div className="text-2xl" style={{ color: '#8B7355' }}>加载中...</div>
          </div>
        ) : materials.length === 0 ? (
          <div className="card rounded-soft p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div style={{ color: '#8B7355' }}>今天暂无学习任务</div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(materialsBySubject).map(([subject, subjectMaterials]) =>
              subjectMaterials.map((material) => {
                const isCompleted = todayMaterialIds.has(material.id)
                const exerciseCount = material.exercises?.length || 0
                return (
                  <Link
                    key={material.id}
                    href={`/child/practice?materialId=${material.id}`}
                    onClick={() => playTap()}
                    className="block"
                  >
                    <div
                      className={`card rounded-soft p-6 flex items-center gap-4 hover:scale-102 transition-transform ${!isCompleted ? 'border-2' : ''}`}
                      style={!isCompleted ? { borderColor: 'rgba(255, 179, 0, 0.5)' } : {}}
                    >
                      <div className="text-4xl">{subjectIcons[subject] || '📝'}</div>
                      <div className="flex-1">
                        <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                          {subjectNames[subject] || subject}：{material.title}
                        </div>
                        <div className="text-sm" style={{ color: '#8B7355' }}>
                          {isCompleted ? '已完成' : '待完成'} · {exerciseCount}题
                        </div>
                      </div>
                      {isCompleted ? (
                        <div className="text-3xl">✅</div>
                      ) : (
                        <button className="btn-primary px-6 py-3 rounded-soft text-white font-semibold touch-target">
                          开始
                        </button>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* 学习区域 */}
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
          🌺 学习花园
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/child/garden" className="block">
            <div className="card rounded-soft p-6 text-center hover:scale-105 transition-transform animate-card-enter" style={{ '--stagger': '0ms' } as React.CSSProperties}>
              <div className="text-5xl mb-3">🏡</div>
              <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                我的花园
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                查看学习进度
              </div>
            </div>
          </Link>

          <Link href="/child/practice" className="block">
            <div className="card rounded-soft p-6 text-center hover:scale-105 transition-transform animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
              <div className="text-5xl mb-3">🎮</div>
              <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                练习乐园
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                趣味答题挑战
              </div>
            </div>
          </Link>

          <Link href="/child/review" className="block">
            <div className="card rounded-soft p-6 text-center hover:scale-105 transition-transform relative animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
              {wrongCount > 0 && (
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#FFB300' }}>
                  {wrongCount}
                </div>
              )}
              <div className="text-5xl mb-3">🔄</div>
              <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                错题复习
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                巩固薄弱环节
              </div>
            </div>
          </Link>

          <Link href="/child/achievements" className="block">
            <div className="card rounded-soft p-6 text-center hover:scale-105 transition-transform animate-card-enter" style={{ '--stagger': '300ms' } as React.CSSProperties}>
              <div className="text-5xl mb-3">🏆</div>
              <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                成就徽章
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                收集中
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 本周统计 */}
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
          📊 本周成长
        </h2>
        <div className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': '350ms' } as React.CSSProperties}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB300' }}>
                {weekDuration > 0 ? `${weekDuration}h` : '--'}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                学习时长
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB300' }}>
                {weekAccuracy > 0 ? `${weekAccuracy}%` : '--'}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                正确率
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB300' }}>
                🔥 {streakDays}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                连续学习天数
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-soft" style={{ position: 'fixed', height: '64px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 50, borderTop: '1px solid rgba(58,46,44,0.08)' }}>
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-around h-full">
            <Link href="/child" onClick={() => playNavigate()} className="flex flex-col items-center justify-center flex-1 touch-target">
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-xs" style={{ color: '#3A2E2C' }}>首页</div>
            </Link>
            <Link href="/child/practice" onClick={() => playNavigate()} className="flex flex-col items-center justify-center flex-1 touch-target">
              <div className="text-2xl mb-1">📝</div>
              <div className="text-xs" style={{ color: '#8B7355' }}>练习</div>
            </Link>
            <Link href="/child/garden" onClick={() => playNavigate()} className="flex flex-col items-center justify-center flex-1 touch-target">
              <div className="text-2xl mb-1">🌻</div>
              <div className="text-xs" style={{ color: '#8B7355' }}>花园</div>
            </Link>
            <Link href="/child/review" onClick={() => playNavigate()} className="flex flex-col items-center justify-center flex-1 touch-target">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-xs" style={{ color: '#8B7355' }}>复习</div>
            </Link>
          </div>
        </div>
      </nav>
    </main>
  )
}
