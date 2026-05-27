'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { StickyHeader } from '@/components/shared/sticky-header'
import { createClient, getClientUser } from '@/lib/supabase/client'
import { playSuccess, playNavigate } from '@/lib/sounds'

interface WrongAnswerWithDetails {
  id: string
  exercise_id: string
  wrong_count: number
  last_wrong_at: string
  mastered: boolean
  exercises: {
    id: string
    question: { type: string; text: string }
    options: string[]
    correct_answer: string
    difficulty: string
    knowledge_points: string[]
    material_id: string
    materials: {
      id: string
      subject: string
      title: string
    }
  } | null
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

const subjectColors: Record<string, string> = {
  math: '#FFB300',
  chinese: '#87CEEB',
  english: '#556B2F'
}

export default function ReviewPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerWithDetails[]>([])
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'math' | 'chinese' | 'english'>('all')
  const [masteringIds, setMasteringIds] = useState<Set<string>>(new Set())

  const fetchWrongAnswers = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getClientUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('wrong_answers')
        .select(`
          id,
          exercise_id,
          wrong_count,
          last_wrong_at,
          mastered,
          exercises (
            id,
            question,
            options,
            correct_answer,
            difficulty,
            knowledge_points,
            material_id,
            materials (
              id,
              subject,
              title
            )
          )
        `)
        .eq('child_id', user.id)
        .eq('mastered', false)
        .order('wrong_count', { ascending: false })

      if (error) {
        console.error('Error fetching wrong answers:', error)
      } else {
        setWrongAnswers((data as unknown as WrongAnswerWithDetails[]) || [])
      }
    } catch (error) {
      console.error('Error fetching wrong answers:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(fetchWrongAnswers)
  }, [fetchWrongAnswers])

  const handleMastered = useCallback(async (wrongAnswerId: string) => {
    setMasteringIds(prev => new Set(prev).add(wrongAnswerId))
    try {
      const { error } = await supabase
        .from('wrong_answers')
        .update({
          mastered: true,
          mastered_at: new Date().toISOString()
        })
        .eq('id', wrongAnswerId)

      if (!error) {
        setWrongAnswers(prev => prev.filter(wa => wa.id !== wrongAnswerId))
        playSuccess()
      }
    } catch (err) {
      console.error('Error marking as mastered:', err)
    } finally {
      setMasteringIds(prev => {
        const next = new Set(prev)
        next.delete(wrongAnswerId)
        return next
      })
    }
  }, [supabase])

  // Filter by subject
  const filteredAnswers = selectedSubject === 'all'
    ? wrongAnswers
    : wrongAnswers.filter(wa => wa.exercises?.materials?.subject === selectedSubject)

  // Group counts
  const subjectCounts = wrongAnswers.reduce<Record<string, number>>((acc, wa) => {
    const subject = wa.exercises?.materials?.subject || 'other'
    acc[subject] = (acc[subject] || 0) + 1
    return acc
  }, {})

  // Smart recommendation: find the subject with highest average wrong_count
  const recommendation = (() => {
    if (wrongAnswers.length === 0) return null
    const subjectWrongTotals: Record<string, { total: number; count: number }> = {}
    for (const wa of wrongAnswers) {
      const subject = wa.exercises?.materials?.subject
      if (!subject) continue
      if (!subjectWrongTotals[subject]) subjectWrongTotals[subject] = { total: 0, count: 0 }
      subjectWrongTotals[subject].total += wa.wrong_count
      subjectWrongTotals[subject].count++
    }
    let maxAvg = 0
    let maxSubject = ''
    for (const [subject, data] of Object.entries(subjectWrongTotals)) {
      const avg = data.total / data.count
      if (avg > maxAvg) {
        maxAvg = avg
        maxSubject = subject
      }
    }
    return maxSubject ? {
      subject: maxSubject,
      subjectName: subjectNames[maxSubject] || maxSubject,
      count: wrongAnswers.filter(wa => wa.exercises?.materials?.subject === maxSubject).length
    } : null
  })()

  function formatTimeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return `${Math.floor(diffDays / 7)}周前`
  }

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-lg" style={{ color: '#8B7355' }}>加载错题中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg pb-24">
      <StickyHeader
        subtitle="错题巩固"
        title="🔄 错题复习"
        right={<span className="text-xl font-bold" style={{ color: '#FFB300' }}>{filteredAnswers.length}</span>}
      />

      {/* 学科筛选 */}
      <div className="container mx-auto px-4 mb-6">
        <div className="card rounded-soft p-2 flex gap-2 animate-card-enter">
          {(['all', 'math', 'chinese', 'english'] as const).map((subject) => {
            const count = subject === 'all'
              ? wrongAnswers.length
              : (subjectCounts[subject] || 0)
            const label = subject === 'all'
              ? '全部'
              : `${subjectIcons[subject] || ''} ${subjectNames[subject]}`
            return (
              <button
                key={subject}
                onClick={() => { setSelectedSubject(subject); playNavigate() }}
                className={`flex-1 py-3 px-2 rounded-soft transition-all touch-target text-sm font-semibold ${
                  selectedSubject === subject ? 'btn-primary text-white' : ''
                }`}
                style={selectedSubject !== subject ? { color: '#3A2E2C' } : {}}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* 智能推荐提示 */}
      {recommendation && wrongAnswers.length > 0 && (
        <div className="container mx-auto px-4 mb-6">
          <div className="p-4 rounded-soft flex items-start gap-3" style={{ backgroundColor: 'rgba(255, 179, 0, 0.15)' }}>
            <span className="text-2xl">💡</span>
            <div>
              <div className="font-semibold mb-1" style={{ color: '#3A2E2C' }}>
                智能推荐
              </div>
              <div className="text-sm" style={{ color: '#5D4E4A' }}>
                建议优先复习{recommendation.subjectName}的错题，共{recommendation.count}题。这些是你最容易出错的知识点！
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错题列表 */}
      <div className="container mx-auto px-4">
        {filteredAnswers.length === 0 ? (
          <div className="card rounded-soft p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-xl font-bold mb-2" style={{ color: '#3A2E2C' }}>
              太棒了！
            </div>
            <div style={{ color: '#8B7355' }}>
              {wrongAnswers.length === 0 ? '暂时没有错题需要复习' : '该学科没有错题'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnswers.map((item, index) => {
              const exercise = item.exercises
              const material = exercise?.materials
              const subject = material?.subject || 'math'
              const isMastering = masteringIds.has(item.id)

              return (
                <div
                  key={item.id}
                  className="card rounded-soft p-6 hover:scale-102 transition-transform animate-list-enter"
                  style={{ '--stagger': `${index * 80}ms` } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{subjectIcons[subject] || '📝'}</div>
                      <div>
                        <div
                          className="text-xs px-2 py-1 rounded-full mb-1 inline-block"
                          style={{
                            backgroundColor: `${subjectColors[subject] || '#8B7355'}20`,
                            color: subjectColors[subject] || '#8B7355'
                          }}
                        >
                          {subjectNames[subject] || '其他'}
                        </div>
                        <div className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
                          {exercise?.question?.text || '题目加载中...'}
                        </div>
                        {material?.title && (
                          <div className="text-xs mt-1" style={{ color: '#8B7355' }}>
                            来源：{material.title}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-1" style={{ color: '#FFB300' }}>
                        {item.wrong_count}次
                      </div>
                      <div className="text-xs" style={{ color: '#8B7355' }}>
                        {formatTimeAgo(item.last_wrong_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-soft" style={{ backgroundColor: 'rgba(229, 115, 115, 0.15)' }}>
                      <div className="mb-1" style={{ color: '#8B7355' }}>
                        ❌ 易错
                      </div>
                      <div className="font-semibold" style={{ color: '#3A2E2C' }}>
                        已错{item.wrong_count}次，需注意
                      </div>
                    </div>
                    <div className="p-3 rounded-soft" style={{ backgroundColor: 'rgba(124, 179, 66, 0.15)' }}>
                      <div className="mb-1" style={{ color: '#8B7355' }}>
                        ✓ 正确答案
                      </div>
                      <div className="font-semibold" style={{ color: '#3A2E2C' }}>
                        {exercise?.correct_answer || '--'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMastered(item.id)}
                    disabled={isMastering}
                    className={`w-full mt-4 py-3 rounded-soft font-semibold touch-target transition-all ${
                      isMastering ? 'opacity-60' : ''
                    }`}
                    style={{
                      backgroundColor: isMastering ? 'rgba(124, 179, 66, 0.3)' : 'rgba(124, 179, 66, 0.15)',
                      color: '#7CB342'
                    }}
                  >
                    {isMastering ? '标记中...' : '已掌握'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部导航栏由 layout.tsx BottomNav 统一提供 */}
    </main>
  )
}
