'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface LearningRecord {
  id: string
  child_id: string
  material_id: string | null
  exercise_id: string | null
  activity_type: 'view' | 'practice' | 'review'
  duration: number
  score: number | null
  is_correct: boolean | null
  created_at: string
  materials?: { title: string; subject: string } | null
}

interface SubjectMastery {
  subject: string
  label: string
  percent: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [totalExercises, setTotalExercises] = useState(0)
  const [unmasteredWrong, setUnmasteredWrong] = useState(0)
  const [recentRecords, setRecentRecords] = useState<LearningRecord[]>([])
  const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([])

  const subjectLabels: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
  }

  const subjectIcons: Record<string, string> = {
    chinese: '📖',
    math: '🔢',
    english: '🔤',
  }

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient()

      // Fetch recent learning records with material info
      const { data: records } = await supabase
        .from('learning_records')
        .select('*, materials(title, subject)')
        .order('created_at', { ascending: false })
        .limit(100)

      // Fetch unmastered wrong answers count
      const { count: wrongCount } = await supabase
        .from('wrong_answers')
        .select('*', { count: 'exact', head: true })
        .eq('mastered', false)

      if (records && records.length > 0) {
        setTotalRecords(records.length)
        setRecentRecords(records.slice(0, 10))

        // Average score from records that have a score
        const scoredRecords = records.filter((r) => r.score !== null)
        const avg = scoredRecords.length > 0
          ? Math.round(scoredRecords.reduce((sum, r) => sum + (r.score || 0), 0) / scoredRecords.length)
          : 0
        setAvgScore(avg)

        // Count practice records as total exercises
        const practiceRecords = records.filter((r) => r.activity_type === 'practice' || r.activity_type === 'review')
        setTotalExercises(practiceRecords.length)

        // Calculate subject mastery from is_correct ratios
        const subjectData: Record<string, { correct: number; total: number }> = {}
        for (const r of records) {
          if (r.materials?.subject && r.is_correct !== null) {
            const subj = r.materials.subject
            if (!subjectData[subj]) subjectData[subj] = { correct: 0, total: 0 }
            subjectData[subj].total++
            if (r.is_correct) subjectData[subj].correct++
          }
        }

        const mastery: SubjectMastery[] = Object.entries(subjectData).map(([subject, data]) => ({
          subject,
          label: subjectLabels[subject] || subject,
          percent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }))
        setSubjectMastery(mastery)
      }

      if (wrongCount !== null) setUnmasteredWrong(wrongCount)
      setLoading(false)
    }

    fetchDashboard()
  }, [])

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `今天 ${time}`
    if (isYesterday) return `昨天 ${time}`
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`
  }

  function formatDuration(seconds: number) {
    if (seconds < 60) return `${seconds}秒`
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}分钟`
    const hours = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hours}h${remMins > 0 ? remMins + 'm' : ''}`
  }

  function getTotalDuration() {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekRecords = recentRecords.filter((r) => new Date(r.created_at) >= weekAgo)
    const totalSecs = weekRecords.reduce((sum, r) => sum + (r.duration || 0), 0)
    const hours = (totalSecs / 3600).toFixed(1)
    return `${hours}h`
  }

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="card rounded-soft p-4 mb-8">
            <div className="flex items-center justify-between content-z">
              <Link href="/parent" className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0" style={{ color: '#3A2E2C' }}>← 返回</Link>
              <div className="text-center">
                <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📊 数据看板</h1>
                <p className="text-xs" style={{ color: '#8B7355' }}>学习数据总览</p>
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
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📊 数据看板</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>学习数据总览</p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '本周学习时长', value: getTotalDuration(), color: '#FFB300' },
            { label: '平均得分', value: `${avgScore}分`, color: '#22c55e' },
            { label: '已完成练习', value: `${totalExercises}`, color: '#3b82f6' },
            { label: '待复习错题', value: `${unmasteredWrong}`, color: '#ef4444' },
          ].map((stat, i) => (
            <div key={i} className="card rounded-soft p-4 text-center hover:translate-y-0 animate-card-enter" style={{ '--stagger': `${i * 100}ms` } as React.CSSProperties}>
              <div className="content-z">
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 各学科掌握度 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '300ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              📈 学科掌握度
            </h2>
            {subjectMastery.length === 0 ? (
              <p className="text-sm" style={{ color: '#8B7355' }}>暂无学科数据</p>
            ) : (
              <div className="space-y-4">
                {subjectMastery.map((item) => (
                  <div key={item.subject}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                        {subjectIcons[item.subject] || ''} {item.label}
                      </span>
                      <span className="text-sm" style={{ color: '#8B7355' }}>{item.percent}%</span>
                    </div>
                    <div className="w-full bg-progress-track rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all bg-progress-fill"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近学习记录 */}
        <div className="card rounded-soft p-6">
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              🕐 最近学习记录
            </h2>
            {recentRecords.length === 0 ? (
              <p className="text-sm" style={{ color: '#8B7355' }}>暂无学习记录</p>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record, index) => {
                  const activityLabels: Record<string, string> = {
                    view: '浏览',
                    practice: '练习',
                    review: '复习',
                  }
                  const scoreText = record.score !== null
                    ? `${record.score}分`
                    : record.is_correct === true
                      ? '正确'
                      : record.is_correct === false
                        ? '错误'
                        : activityLabels[record.activity_type] || '完成'

                  return (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-xl card-alt-bg animate-list-enter" style={{ '--stagger': `${index * 80}ms` } as React.CSSProperties}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                          {record.materials?.title || `${activityLabels[record.activity_type] || '学习'}记录`}
                        </div>
                        <div className="text-xs" style={{ color: '#8B7355' }}>
                          {formatTime(record.created_at)}
                          {record.duration > 0 && ` · ${formatDuration(record.duration)}`}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full" style={{
                        backgroundColor: record.is_correct === false ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: record.is_correct === false ? '#ef4444' : '#16a34a',
                      }}>
                        {scoreText}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
