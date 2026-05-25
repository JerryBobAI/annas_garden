'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface MaterialWithExercises {
  id: string
  subject: string
  grade: string
  type: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
  source: string
  status: string
  created_at: string
  exercises: Exercise[]
}

interface Exercise {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  question: any
  options: string[] | null
  correct_answer: string
  difficulty: string
  knowledge_points: string[]
}

const subjectLabels: Record<string, string> = {
  chinese: '📖 语文',
  math: '🔢 数学',
  english: '🔤 英语',
}

const sourceLabels: Record<string, string> = {
  manual: '手动上传',
  ai_generated: 'AI 识别',
  external: '外部资源',
}

const difficultyLabels: Record<string, { text: string; color: string }> = {
  easy: { text: '简单', color: 'bg-green-100 text-green-700' },
  medium: { text: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { text: '困难', color: 'bg-red-100 text-red-700' },
}

export default function ReviewPage() {
  const [materials, setMaterials] = useState<MaterialWithExercises[]>([])
  const [approved, setApproved] = useState<MaterialWithExercises[]>([])
  const [rejected, setRejected] = useState<MaterialWithExercises[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const supabase = createClient()

  // useCallback 包裹避免 React Compiler 级联渲染警告
  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    // 获取待审核资料
    const { data: draftData } = await supabase
      .from('materials')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    // 获取已通过
    const { data: approvedData } = await supabase
      .from('materials')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20)

    // 获取已拒绝
    const { data: rejectedData } = await supabase
      .from('materials')
      .select('*')
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(20)

    // 为每个资料获取练习题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichWithExercises = async (items: any[]) => {
      if (!items) return []
      return Promise.all(
        items.map(async (item) => {
          const { data: exercises } = await supabase
            .from('exercises')
            .select('*')
            .eq('material_id', item.id)
          return { ...item, exercises: exercises || [] }
        })
      )
    }

    const [draftWithEx, approvedWithEx, rejectedWithEx] = await Promise.all([
      enrichWithExercises(draftData || []),
      enrichWithExercises(approvedData || []),
      enrichWithExercises(rejectedData || []),
    ])

    setMaterials(draftWithEx as MaterialWithExercises[])
    setApproved(approvedWithEx as MaterialWithExercises[])
    setRejected(rejectedWithEx as MaterialWithExercises[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMaterials()
  }, [fetchMaterials])

  async function handleAction(id: string, action: 'approved' | 'rejected' | 'draft') {
    const { error } = await supabase
      .from('materials')
      .update({ status: action })
      .eq('id', id)

    if (!error) {
      fetchMaterials()
      setExpandedId(null)
    }
  }

  const currentList = tab === 'pending' ? materials : tab === 'approved' ? approved : rejected

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 导航 */}
        <div className="card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between content-z">
            <Link
              href="/parent"
              className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0 transition-all"
              style={{ color: '#3A2E2C' }}
            >
              ← 返回
            </Link>
            <div className="text-center">
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>✅ 内容审核</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>查看并审核学习内容</p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button onClick={() => setTab('pending')} className={`card rounded-xl p-4 text-center content-z animate-card-enter ${tab === 'pending' ? 'border-2 border-amber-400/50' : ''}`} style={{ '--stagger': '0ms' } as React.CSSProperties}>
            <div className="text-2xl font-bold" style={{ color: '#FFB300' }}>{materials.length}</div>
            <div className="text-sm" style={{ color: '#8B7355' }}>待审核</div>
          </button>
          <button onClick={() => setTab('approved')} className={`card rounded-xl p-4 text-center content-z animate-card-enter ${tab === 'approved' ? 'border-2 border-green-400/50' : ''}`} style={{ '--stagger': '50ms' } as React.CSSProperties}>
            <div className="text-2xl font-bold text-green-600">{approved.length}</div>
            <div className="text-sm" style={{ color: '#8B7355' }}>已通过</div>
          </button>
          <button onClick={() => setTab('rejected')} className={`card rounded-xl p-4 text-center content-z animate-card-enter ${tab === 'rejected' ? 'border-2 border-red-400/50' : ''}`} style={{ '--stagger': '100ms' } as React.CSSProperties}>
            <div className="text-2xl font-bold text-red-500">{rejected.length}</div>
            <div className="text-sm" style={{ color: '#8B7355' }}>已拒绝</div>
          </button>
        </div>

        {/* 内容列表 */}
        {loading ? (
          <div className="card rounded-soft p-12 text-center content-z">
            <div className="text-4xl mb-3">⏳</div>
            <p style={{ color: '#8B7355' }}>加载中...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="card rounded-soft p-12 text-center content-z">
            <div className="text-4xl mb-3">{tab === 'pending' ? '🎉' : tab === 'approved' ? '📭' : '📭'}</div>
            <p style={{ color: '#8B7355' }}>
              {tab === 'pending' ? '没有待审核的内容' : tab === 'approved' ? '暂无已通过的内容' : '暂无已拒绝的内容'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((item, index) => (
              <div key={item.id} className="card rounded-soft content-z animate-list-enter" style={{ '--stagger': `${index * 80}ms` } as React.CSSProperties}>
                {/* 标题栏 */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {subjectLabels[item.subject] || item.subject}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/50" style={{ color: '#8B7355' }}>
                        {sourceLabels[item.source] || item.source}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg" style={{ color: '#3A2E2C' }}>{item.title}</h3>
                    <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                      {item.type} · {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="px-4 py-2 text-sm rounded-xl card-alt-bg hover:opacity-80 transition-opacity"
                    style={{ color: '#3A2E2C' }}
                  >
                    {expandedId === item.id ? '收起 ↑' : '查看详情 ↓'}
                  </button>
                </div>

                {/* 展开详情 */}
                {expandedId === item.id && (
                  <div className="mt-4 pt-4 border-t border-amber-200/30 space-y-4">
                    {/* 资料描述 */}
                    {item.content?.description && (
                      <div className="p-3 rounded-xl bg-amber-50/50">
                        <p className="text-sm font-medium mb-1" style={{ color: '#3A2E2C' }}>描述</p>
                        <p className="text-sm" style={{ color: '#5D4E4A' }}>{item.content.description}</p>
                      </div>
                    )}

                    {/* 知识点 */}
                    {item.content?.knowledge_points && (
                      <div className="flex flex-wrap gap-2">
                        {(item.content.knowledge_points as string[]).map((kp, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-100/50" style={{ color: '#FFB300' }}>
                            #{kp}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 练习题预览 */}
                    {item.exercises.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#3A2E2C' }}>
                          包含 {item.exercises.length} 道练习题：
                        </p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {item.exercises.map((ex, i) => (
                            <div key={ex.id} className="p-3 rounded-xl bg-white/40 border border-amber-200/30">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                                  第 {i + 1} 题
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyLabels[ex.difficulty]?.color || 'bg-gray-100 text-gray-600'}`}>
                                  {difficultyLabels[ex.difficulty]?.text || ex.difficulty}
                                </span>
                              </div>
                              <p className="text-sm mb-2" style={{ color: '#3A2E2C' }}>
                                {ex.question?.text || JSON.stringify(ex.question)}
                              </p>
                              {ex.options && (
                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                  {(ex.options as string[]).map((opt, j) => (
                                    <div
                                      key={j}
                                      className={`text-xs px-2 py-1.5 rounded-lg ${
                                        opt === ex.correct_answer
                                          ? 'bg-green-100 text-green-700 font-medium'
                                          : 'bg-white/50'
                                      }`}
                                      style={opt !== ex.correct_answer ? { color: '#5D4E4A' } : undefined}
                                    >
                                      {String.fromCharCode(65 + j)}. {opt}
                                      {opt === ex.correct_answer && ' ✓'}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {ex.knowledge_points && ex.knowledge_points.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {ex.knowledge_points.map((kp, j) => (
                                    <span key={j} className="text-xs px-1.5 py-0.5 rounded bg-gray-100/50" style={{ color: '#8B7355' }}>
                                      {kp}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    {tab === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleAction(item.id, 'approved')}
                          className="flex-1 py-3 rounded-xl bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition-colors touch-target"
                        >
                          ✓ 通过审核
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'rejected')}
                          className="flex-1 py-3 rounded-xl bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition-colors touch-target"
                        >
                          ✗ 拒绝
                        </button>
                      </div>
                    )}

                    {/* 已处理状态回退 */}
                    {tab !== 'pending' && (
                      <button
                        onClick={() => handleAction(item.id, 'draft')}
                        className="w-full py-2 rounded-xl bg-amber-100 text-amber-700 text-sm hover:bg-amber-200 transition-colors"
                      >
                        ← 重新放回待审核
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
