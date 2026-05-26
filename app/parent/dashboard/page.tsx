'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { createClient } from '@/lib/supabase/client'
import type { LearningReport, Subject } from '@/types'

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

interface KnowledgeMasteryItem {
  subject: Subject
  knowledge_point: string
  mastery_level: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<LearningReport | null>(null)
  const [generating, setGenerating] = useState(false)
  const [masteryItems, setMasteryItems] = useState<KnowledgeMasteryItem[]>([])
  const [totalConversations, setTotalConversations] = useState(0)
  const [gardenPlants, setGardenPlants] = useState(0)
  const [childId, setChildId] = useState<string>('')
  const [childName, setChildName] = useState('小朋友')

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .single()

      let resolvedChildId = user.id
      let resolvedChildName = profile?.display_name || '小朋友'

      if (profile?.role === 'parent') {
        const { data: children } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('parent_id', user.id)
          .eq('role', 'child')
          .limit(1)

        const child = children?.[0]
        if (child) {
          resolvedChildId = child.id
          resolvedChildName = child.display_name || '小朋友'
        }
        // 未绑定孩子账号时，家长账号可查看本人学习数据（同设备兼任）
      }

      setChildId(resolvedChildId)
      setChildName(resolvedChildName)

      // 并行查询
      const [reportRes, masteryRes, convRes, plantRes] = await Promise.all([
        fetch(`/api/reports?child_id=${resolvedChildId}&type=weekly&limit=1`),
        supabase
          .from('knowledge_mastery')
          .select('subject, knowledge_point, mastery_level')
          .eq('child_id', resolvedChildId)
          .order('mastery_level', { ascending: false })
          .limit(20),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', resolvedChildId),
        supabase
          .from('garden_plants')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', resolvedChildId),
      ])

      if (reportRes.ok) {
        const data = await reportRes.json()
        if (data.reports?.length > 0) setReport(data.reports[0])
      }

      if (masteryRes.data) setMasteryItems(masteryRes.data as KnowledgeMasteryItem[])
      setTotalConversations(convRes.count || 0)
      setGardenPlants(plantRes.count || 0)
      setLoading(false)
    }

    fetchDashboard()
  }, [])

  async function handleGenerateReport() {
    if (!childId || generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, type: 'weekly' }),
      })
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('Report generation failed:', err.error || res.status)
      }
    } catch (err) {
      console.error('Report generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  // 按学科分组掌握度
  const masteryBySubject = masteryItems.reduce<Record<string, KnowledgeMasteryItem[]>>((acc, item) => {
    if (!acc[item.subject]) acc[item.subject] = []
    acc[item.subject].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="card rounded-soft p-4 mb-8">
            <div className="flex items-center justify-between content-z">
              <BackIconLink href="/parent" label="返回家长中心" />
              <div className="text-center">
                <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📊 学习洞察</h1>
                <p className="text-xs" style={{ color: '#8B7355' }}>AI 学习报告</p>
              </div>
              <div className="w-10" />
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
            <BackIconLink href="/parent" label="返回家长中心" />
            <div className="text-center">
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📊 {childName} 的学习报告</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>AI 学习洞察</p>
            </div>
            <div className="w-10" />
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '对话次数', value: totalConversations, emoji: '💬', color: '#FFB300' },
            { label: '花园植物', value: gardenPlants, emoji: '🌱', color: '#22c55e' },
            { label: '知识点', value: masteryItems.length, emoji: '📚', color: '#3b82f6' },
          ].map((stat, i) => (
            <div key={i} className="card rounded-soft p-4 text-center animate-card-enter" style={{ '--stagger': `${i * 100}ms` } as React.CSSProperties}>
              <div className="content-z">
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                  {stat.emoji} {stat.value}
                </div>
                <div className="text-xs" style={{ color: '#8B7355' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI 报告 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
          <div className="content-z">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#3A2E2C' }}>
                🧠 AI 摘要
              </h2>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="px-3 py-1.5 text-xs rounded-xl card border-soft transition-all"
                style={{ color: '#3A2E2C', opacity: generating ? 0.5 : 1 }}
              >
                {generating ? '生成中...' : report ? '🔄 更新报告' : '✨ 生成报告'}
              </button>
            </div>
            {report?.ai_summary ? (
              <div className="text-sm leading-relaxed p-4 rounded-xl" style={{ color: '#3A2E2C', backgroundColor: 'rgba(255,179,0,0.08)' }}>
                {report.ai_summary}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#8B7355' }}>
                点击「生成报告」查看 AI 为 {childName} 撰写的学习报告
              </p>
            )}
          </div>
        </div>

        {/* 知识掌握趋势 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '300ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              📈 知识掌握
            </h2>
            {Object.keys(masteryBySubject).length === 0 ? (
              <p className="text-sm" style={{ color: '#8B7355' }}>暂无掌握度数据，学习后自动生成</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(masteryBySubject).map(([subject, items]) => {
                  const avg = Math.round(items.reduce((s, i) => s + i.mastery_level, 0) / items.length)
                  return (
                    <div key={subject}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                          {subjectIcons[subject] || ''} {subjectLabels[subject] || subject}
                        </span>
                        <span className="text-sm font-bold" style={{ color: '#FFB300' }}>{avg}%</span>
                      </div>
                      <div className="w-full bg-progress-track rounded-full h-3 mb-2">
                        <div
                          className="h-3 rounded-full transition-all bg-progress-fill"
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.slice(0, 5).map(item => (
                          <span
                            key={item.knowledge_point}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: item.mastery_level >= 60 ? 'rgba(34,197,94,0.1)' :
                                item.mastery_level >= 30 ? 'rgba(255,179,0,0.1)' : 'rgba(239,68,68,0.1)',
                              color: item.mastery_level >= 60 ? '#16a34a' :
                                item.mastery_level >= 30 ? '#d97706' : '#ef4444',
                            }}
                          >
                            {item.knowledge_point} {item.mastery_level}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI 建议 */}
        {report?.ai_suggestions && report.ai_suggestions.length > 0 && (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '400ms' } as React.CSSProperties}>
            <div className="content-z">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
                💡 AI 建议
              </h2>
              <div className="space-y-3">
                {report.ai_suggestions.map((suggestion, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.05)' }}>
                    <span className="text-lg">{['🌟', '📖', '🎯'][i] || '💡'}</span>
                    <p className="text-sm flex-1" style={{ color: '#3A2E2C' }}>{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 兴趣 + 花园 */}
        {report?.content && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card rounded-soft p-4 animate-card-enter" style={{ '--stagger': '500ms' } as React.CSSProperties}>
              <div className="content-z">
                <h3 className="text-sm font-bold mb-2" style={{ color: '#3A2E2C' }}>🌱 兴趣追踪</h3>
                <div className="flex flex-wrap gap-1">
                  {report.content.interests.top_topics.slice(0, 4).map(t => (
                    <span key={t.topic} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,179,0,0.1)', color: '#d97706' }}>
                      #{t.topic}
                    </span>
                  ))}
                </div>
                {report.content.interests.curiosity_seeds_count > 0 && (
                  <p className="text-xs mt-2" style={{ color: '#8B7355' }}>
                    好奇心问题 {report.content.interests.curiosity_seeds_count} 个
                  </p>
                )}
              </div>
            </div>
            <div className="card rounded-soft p-4 animate-card-enter" style={{ '--stagger': '600ms' } as React.CSSProperties}>
              <div className="content-z">
                <h3 className="text-sm font-bold mb-2" style={{ color: '#3A2E2C' }}>🌳 花园成长</h3>
                <div className="text-xs space-y-1" style={{ color: '#8B7355' }}>
                  <p>新增 {report.content.garden.new_plants} 棵</p>
                  <p>开花 {report.content.garden.blooming} 棵</p>
                  <p>总计 {report.content.garden.total_plants} 棵</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 内容导入入口 */}
        <Link href="/parent/content/import">
          <div className="card rounded-soft p-4 text-center animate-card-enter" style={{ '--stagger': '700ms' } as React.CSSProperties}>
            <div className="content-z">
              <span className="text-2xl">📥</span>
              <p className="text-sm font-medium mt-1" style={{ color: '#3A2E2C' }}>导入学习内容</p>
              <p className="text-xs" style={{ color: '#8B7355' }}>粘贴课本内容，AI 自动提取知识点</p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  )
}
