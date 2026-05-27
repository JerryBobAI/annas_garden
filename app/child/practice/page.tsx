'use client'

import React, { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { StickyHeader } from '@/components/shared/sticky-header'
import { createClient, getClientUser } from '@/lib/supabase/client'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'

interface Material {
  id: string
  subject: string
  title: string
}

interface Exercise {
  id: string
  material_id: string
  question: { type: string; text: string }
  options: string[]
  correct_answer: string
  difficulty: string
  knowledge_points: string[]
}

type PageState = 'loading' | 'practice' | 'feedback' | 'summary'

const subjectNames: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语'
}

const difficultyLabels: Record<string, { text: string; color: string; bgColor: string }> = {
  easy: { text: '简单', color: '#7CB342', bgColor: 'rgba(124, 179, 66, 0.2)' },
  medium: { text: '中等', color: '#FFB300', bgColor: 'rgba(255, 179, 0, 0.2)' },
  hard: { text: '困难', color: '#E53935', bgColor: 'rgba(229, 57, 53, 0.2)' }
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen watercolor-bg flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4">📝</div><div className="text-lg" style={{ color: '#8B7355' }}>加载中...</div></div></div>}>
      <PracticeContent />
    </Suspense>
  )
}

function PracticeContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const materialId = searchParams.get('materialId')

  // State
  const [pageState, setPageState] = useState<PageState>('loading')
  const [material, setMaterial] = useState<Material | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)

  // Results tracking
  const [results, setResults] = useState<{ exerciseId: string; correct: boolean; duration: number }[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  const fetchExercises = useCallback(async () => {
    setPageState('loading')
    try {
      let targetMaterialId = materialId

      // If no materialId specified, default to first approved exercise material
      if (!targetMaterialId) {
        const { data: firstMaterial } = await supabase
          .from('materials')
          .select('id')
          .eq('status', 'approved')
          .eq('type', 'exercise')
          .order('created_at')
          .limit(1)
          .single()

        if (!firstMaterial) {
          setPageState('practice')
          return
        }
        targetMaterialId = firstMaterial.id
      }

      // Fetch material info
      const { data: materialData } = await supabase
        .from('materials')
        .select('id, subject, title')
        .eq('id', targetMaterialId)
        .single()

      if (materialData) {
        setMaterial(materialData)
      }

      // Fetch exercises for this material
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('id, material_id, question, options, correct_answer, difficulty, knowledge_points')
        .eq('material_id', targetMaterialId)
        .order('created_at')

      if (exercisesData && exercisesData.length > 0) {
        setExercises(exercisesData as Exercise[])
        setQuestionStartTime(Date.now())
        setPageState('practice')
      } else {
        setPageState('practice')
      }
    } catch (error) {
      console.error('Error fetching exercises:', error)
      setPageState('practice')
    }
  }, [materialId, supabase])

  useEffect(() => {
    void Promise.resolve().then(fetchExercises)
  }, [fetchExercises])

  const saveAnswer = useCallback(async (exercise: Exercise, correct: boolean, duration: number) => {
    try {
      const user = await getClientUser()
      if (!user) return

      await supabase.from('learning_records').insert({
        child_id: user.id,
        material_id: material?.id,
        exercise_id: exercise.id,
        activity_type: 'practice',
        duration,
        score: correct ? 100 : 0,
        is_correct: correct
      })

      if (!correct) {
        await supabase.from('wrong_answers').upsert(
          { child_id: user.id, exercise_id: exercise.id, wrong_count: 1, last_wrong_at: new Date().toISOString(), mastered: false },
          { onConflict: 'child_id,exercise_id', ignoreDuplicates: false }
        )
        const { data: existingWrong } = await supabase
          .from('wrong_answers')
          .select('id, wrong_count')
          .eq('child_id', user.id)
          .eq('exercise_id', exercise.id)
          .single()
        if (existingWrong && existingWrong.wrong_count <= 1) {
          await supabase.from('wrong_answers')
            .update({ wrong_count: existingWrong.wrong_count + 1, last_wrong_at: new Date().toISOString(), mastered: false })
            .eq('id', existingWrong.id)
        }
      }
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }, [material, supabase])

  const handleAnswer = useCallback((answer: string) => {
    if (!exercises.length || selectedAnswer) return

    const exercise = exercises[currentIndex]
    const correct = answer === exercise.correct_answer
    const duration = Math.round((Date.now() - questionStartTime) / 1000)

    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setQuestionStartTime(Date.now())
    setPageState('feedback')

    if (correct) {
      playCorrect()
    } else {
      playWrong()
    }

    if (correct) {
      setCorrectCount(prev => prev + 1)
    } else {
      setWrongCount(prev => prev + 1)
    }

    setResults(prev => [...prev, { exerciseId: exercise.id, correct, duration }])

    // Background write to Supabase (non-blocking)
    void saveAnswer(exercise, correct, duration)
  }, [exercises, currentIndex, selectedAnswer, questionStartTime, saveAnswer])

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setPageState('practice')
      setQuestionStartTime(Date.now())
    } else {
      setPageState('summary')
    }
  }, [currentIndex, exercises.length])

  // Loading state
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-lg" style={{ color: '#8B7355' }}>加载题目中...</div>
        </div>
      </main>
    )
  }

  // No exercises
  if (exercises.length === 0) {
    return (
      <main className="min-h-screen watercolor-bg pb-24">
        <div className="card rounded-soft p-4 mb-6">
          <div className="flex items-center justify-between content-z">
            <Link href="/child" className="text-2xl touch-target" style={{ color: '#3A2E2C' }}>←</Link>
            <div className="text-center">
              <div className="text-xs" style={{ color: '#8B7355' }}>练习</div>
              <div className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>题目加载</div>
            </div>
            <div className="w-8" />
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="card rounded-soft p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-xl font-bold mb-2" style={{ color: '#3A2E2C' }}>暂无题目</div>
            <div className="mb-6" style={{ color: '#8B7355' }}>该练习还没有添加题目</div>
            <Link href="/child" className="btn-primary px-8 py-3 rounded-soft text-white font-semibold inline-block">
              返回首页
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const exercise = exercises[currentIndex]

  // Summary state
  if (pageState === 'summary') {
    const totalQuestions = exercises.length
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

    return (
      <main className="min-h-screen watercolor-bg pb-24">
        <div className="card rounded-soft p-4 mb-6">
          <div className="flex items-center justify-between content-z">
            <Link href="/child" className="text-2xl touch-target" style={{ color: '#3A2E2C' }}>←</Link>
            <div className="text-center">
              <div className="text-xs" style={{ color: '#8B7355' }}>练习完成</div>
              <div className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
                {material?.title || '练习'}
              </div>
            </div>
            <div className="w-8" />
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="card rounded-soft p-8 text-center">
            <div className="text-8xl mb-6">
              {percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '💪'}
            </div>
            <div className="text-4xl font-bold mb-2" style={{ color: '#FFB300' }}>
              {percentage}%
            </div>
            <div className="text-lg mb-8" style={{ color: '#8B7355' }}>
              {percentage >= 80 ? '太棒了！继续加油！' : percentage >= 60 ? '不错哦，再努力一下！' : '没关系，多多练习就会了！'}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-soft animate-card-enter" style={{ '--stagger': '0ms', backgroundColor: 'rgba(124, 179, 66, 0.15)' } as React.CSSProperties}>
                <div className="text-3xl font-bold mb-1" style={{ color: '#7CB342' }}>{correctCount}</div>
                <div className="text-sm" style={{ color: '#8B7355' }}>答对</div>
              </div>
              <div className="p-4 rounded-soft animate-card-enter" style={{ '--stagger': '100ms', backgroundColor: 'rgba(229, 115, 115, 0.15)' } as React.CSSProperties}>
                <div className="text-3xl font-bold mb-1" style={{ color: '#E53935' }}>{wrongCount}</div>
                <div className="text-sm" style={{ color: '#8B7355' }}>答错</div>
              </div>
              <div className="p-4 rounded-soft animate-card-enter" style={{ '--stagger': '200ms', backgroundColor: 'rgba(255, 179, 0, 0.15)' } as React.CSSProperties}>
                <div className="text-3xl font-bold mb-1" style={{ color: '#FFB300' }}>{totalDuration}s</div>
                <div className="text-sm" style={{ color: '#8B7355' }}>用时</div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/child"
                className="block btn-primary py-4 rounded-soft text-white font-semibold text-lg touch-target"
              >
                返回首页
              </Link>
              {wrongCount > 0 && (
                <Link
                  href="/child/review"
                  className="block py-4 rounded-soft font-semibold text-lg touch-target text-center"
                  style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#FFB300' }}
                >
                  去复习错题
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Practice / Feedback state
  const diff = difficultyLabels[exercise.difficulty] || difficultyLabels.medium

  return (
    <main className="min-h-screen watercolor-bg pb-24">
      <StickyHeader
        subtitle={subjectNames[material?.subject || ''] || '练习'}
        title={material?.title || '练习'}
        right={<span className="text-xl font-bold" style={{ color: '#FFB300' }}>{currentIndex + 1}/{exercises.length}</span>}
      />
      <div className="container mx-auto px-4">

        {/* 进度条 */}
        <div className="card rounded-soft p-3 mt-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(58, 46, 44, 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / exercises.length) * 100}%`,
                background: 'linear-gradient(90deg, #FFB300 0%, #FFA000 100%)'
              }}
            />
          </div>
        </div>
      </div>

      {/* 题目卡片 */}
      <div className="container mx-auto px-4 mt-4">
        <div className="card rounded-soft p-8 mb-8 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
          {/* 难度标识 */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className="px-4 py-1 rounded-full text-sm"
              style={{ backgroundColor: diff.bgColor, color: diff.color }}
            >
              {diff.text}
            </span>
            {exercise.knowledge_points?.length > 0 && (
              <span
                className="px-4 py-1 rounded-full text-sm"
                style={{ backgroundColor: 'rgba(85, 107, 47, 0.2)', color: '#556B2F' }}
              >
                {exercise.knowledge_points[0]}
              </span>
            )}
          </div>

          {/* 题目 */}
          <div className="text-center mb-12">
            <div className="text-3xl md:text-5xl font-bold" style={{ color: '#3A2E2C' }}>
              {exercise.question?.text || '题目加载中...'}
            </div>
          </div>

          {/* 选项 */}
          {pageState === 'practice' ? (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {(exercise.options || []).map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="p-6 rounded-soft text-2xl font-bold touch-target cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-150 text-center"
                  style={{
                    '--stagger': `${index * 50}ms`,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    color: '#3A2E2C',
                    border: '2px solid rgba(58, 46, 44, 0.1)'
                  } as React.CSSProperties}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* 选项反馈 — 绿色/红色背景 */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                {(exercise.options || []).map((option, index) => {
                  const isSelected = selectedAnswer === option
                  const isCorrectOption = option === exercise.correct_answer
                  let bgColor = 'rgba(58, 46, 44, 0.05)'
                  if (isSelected && isCorrect) bgColor = 'rgba(124, 179, 66, 0.3)'
                  else if (isSelected && !isCorrect) bgColor = 'rgba(229, 57, 53, 0.3)'
                  else if (!isSelected && isCorrectOption) bgColor = 'rgba(124, 179, 66, 0.3)'
                  const opacity = (!isSelected && !isCorrectOption) ? 0.4 : 1

                  const showHint = !isCorrect && !isSelected && isCorrectOption

                  return (
                    <div key={index} className={`p-6 rounded-soft text-2xl font-bold text-center ${showHint ? 'animate-hint-pulse' : 'transition-opacity duration-300'}`} style={{ backgroundColor: bgColor, color: '#3A2E2C', opacity }}>
                      {option}
                    </div>
                  )
                })}
              </div>

              {/* 反馈 emoji + 文字 */}
              <div className="text-center">
                <div className={`text-8xl mb-6 ${isCorrect ? 'animate-celebrate' : 'animate-encourage'}`}>
                  {isCorrect ? '🎉' : '💪'}
                </div>
                <div className="text-2xl font-bold mb-4 animate-text-pop" style={{ color: isCorrect ? '#7CB342' : '#FFB300' }}>
                  {isCorrect ? '太棒了！答对了！' : '没关系，继续努力！'}
                </div>
                <button
                  onClick={() => { playTap(); handleNext() }}
                  className="btn-primary px-12 py-4 text-xl font-semibold text-white rounded-soft touch-target animate-text-pop-delay"
                >
                  {currentIndex < exercises.length - 1 ? '下一题 →' : '查看结果 🏆'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 底部导航栏由 layout.tsx BottomNav 统一提供 */}
    </main>
  )
}
