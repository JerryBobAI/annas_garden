'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ============================================
// 类型定义
// ============================================
interface LearningGoal {
  id: string
  semester_id: string
  subject: string
  week_number: number
  title: string
  description: string | null
  priority: string
  mastery_threshold: number
}

interface DataSource {
  id: string
  name: string
  type: string
  url: string
  config: Record<string, unknown>
  enabled: boolean
  last_sync_at: string | null
  created_at: string
}

interface ExerciseForm {
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  difficulty: string
}

const supabase = createClient()

const subjectConfig: Record<string, { emoji: string; label: string }> = {
  chinese: { emoji: '📖', label: '语文' },
  math: { emoji: '🔢', label: '数学' },
  english: { emoji: '🔤', label: '英语' },
}

const sourceTypeConfig: Record<string, { emoji: string; label: string; desc: string }> = {
  rss: { emoji: '📡', label: 'RSS 订阅', desc: '订阅教育资讯' },
  api: { emoji: '🔌', label: 'API 接口', desc: '连接教育平台' },
  scrape: { emoji: '🌐', label: '网页抓取', desc: '定时抓取内容' },
}

const difficultyLabels: Record<string, { text: string; className: string }> = {
  easy: { text: '简单', className: 'bg-green-100 text-green-700' },
  medium: { text: '中等', className: 'bg-amber-100 text-amber-700' },
  hard: { text: '困难', className: 'bg-red-100 text-red-700' },
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '从未同步'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} 小时前`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} 天前`
  return date.toLocaleDateString('zh-CN')
}

const emptyExercise: ExerciseForm = {
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  difficulty: 'medium',
}

// ============================================
// 主页面
// ============================================
export default function ContentManagePage() {
  const [selectedTab, setSelectedTab] = useState<'upload' | 'ai' | 'external'>('upload')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // --- 手动上传状态 ---
  const [subject, setSubject] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([])
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ ...emptyExercise }])

  // --- 外部资源状态 ---
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', type: 'rss', url: '' })

  // --- AI 识别状态 ---
  const [aiMode, setAiMode] = useState<'text' | 'image'>('text')
  const [aiText, setAiText] = useState('')
  const [aiSubject, setAiSubject] = useState<string>('')
  const [aiImage, setAiImage] = useState<string | null>(null)
  const [aiImageName, setAiImageName] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    title: string
    exercises: {
      id: string
      question: string
      options: string[]
      correct_answer: string
      difficulty: string
      knowledge_points: string[]
    }[]
  } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSaving, setAiSaving] = useState(false)

  // ============================================
  // 获取当前学期
  // ============================================
  const getCurrentSemester = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('semesters')
      .select('id')
      .lte('start_date', today)
      .gte('end_date', today)
      .single()
    return data?.id ?? null
  }, [])

  // ============================================
  // 获取学习目标
  // ============================================
  const fetchLearningGoals = useCallback(async (semesterId: string, sub: string) => {
    if (!sub) {
      setLearningGoals([])
      return
    }
    const { data } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('semester_id', semesterId)
      .eq('subject', sub)
      .order('week_number', { ascending: true })
    setLearningGoals(data ?? [])
  }, [])

  // 学科切换时加载目标
  useEffect(() => {
    if (!subject) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLearningGoals([])
      setSelectedGoalId('')
      return
    }
    getCurrentSemester().then((semId) => {
      if (semId) fetchLearningGoals(semId, subject)
    })
  }, [subject, getCurrentSemester, fetchLearningGoals])

  // ============================================
  // 获取外部数据源
  // ============================================
  const fetchDataSources = useCallback(async () => {
    const { data } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false })
    setDataSources(data ?? [])
  }, [])

  useEffect(() => {
    if (selectedTab === 'external') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDataSources()
    }
  }, [selectedTab, fetchDataSources])

  // ============================================
  // 显示消息
  // ============================================
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ============================================
  // 练习题管理
  // ============================================
  const updateExercise = (index: number, field: keyof ExerciseForm, value: string) => {
    setExercises((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addExercise = () => {
    setExercises((prev) => [...prev, { ...emptyExercise }])
  }

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // 保存资料（草稿/发布）
  // ============================================
  const handleSave = async (status: 'draft' | 'approved') => {
    if (!subject) {
      showMessage('error', '请选择学科')
      return
    }
    if (!title.trim()) {
      showMessage('error', '请输入标题')
      return
    }

    setLoading(true)
    try {
      // 1. 插入 materials
      const { data: material, error: matError } = await supabase
        .from('materials')
        .insert({
          subject,
          title: title.trim(),
          type: 'exercise',
          content: { description: description.trim() },
          source: 'manual',
          status,
          goal_id: selectedGoalId || null,
        })
        .select()
        .single()

      if (matError) throw matError

      // 2. 插入练习题（排除空题目）
      const validExercises = exercises.filter((e) => e.question.trim())
      if (validExercises.length > 0 && material) {
        const rows = validExercises.map((e) => ({
          material_id: material.id,
          question: { text: e.question.trim() },
          options: [e.optionA, e.optionB, e.optionC, e.optionD].filter(Boolean),
          correct_answer: e.correctAnswer,
          difficulty: e.difficulty,
        }))
        const { error: exError } = await supabase.from('exercises').insert(rows)
        if (exError) throw exError
      }

      const statusLabel = status === 'draft' ? '草稿' : '已发布'
      showMessage('success', `${statusLabel}保存成功！`)

      // 重置表单
      setTitle('')
      setDescription('')
      setSelectedGoalId('')
      setExercises([{ ...emptyExercise }])
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // 同步数据源
  // ============================================
  const handleSync = async (id: string) => {
    const { error } = await supabase
      .from('data_sources')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      showMessage('error', '同步失败：' + error.message)
    } else {
      showMessage('success', '同步成功')
      fetchDataSources()
    }
  }

  // ============================================
  // 切换数据源启用/禁用
  // ============================================
  const handleToggleSource = async (ds: DataSource) => {
    const { error } = await supabase
      .from('data_sources')
      .update({ enabled: !ds.enabled })
      .eq('id', ds.id)
    if (error) {
      showMessage('error', '操作失败：' + error.message)
    } else {
      fetchDataSources()
    }
  }

  // ============================================
  // 添加新数据源
  // ============================================
  const handleAddSource = async () => {
    if (!newSource.name.trim() || !newSource.url.trim()) {
      showMessage('error', '请填写名称和 URL')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('data_sources').insert({
        name: newSource.name.trim(),
        type: newSource.type,
        url: newSource.url.trim(),
        enabled: false,
      })
      if (error) throw error
      showMessage('success', '数据源添加成功')
      setNewSource({ name: '', type: 'rss', url: '' })
      setShowAddSource(false)
      fetchDataSources()
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : '添加失败')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // AI 生成练习题
  // ============================================
  const handleAiGenerate = async () => {
    if (aiMode === 'text' && !aiText.trim()) {
      showMessage('error', '请输入内容')
      return
    }
    if (aiMode === 'image' && !aiImage) {
      showMessage('error', '请上传图片')
      return
    }

    setAiLoading(true)
    setAiError(null)
    setAiResult(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiMode,
          text: aiMode === 'text' ? aiText.trim() : undefined,
          image: aiMode === 'image' ? aiImage : undefined,
          subject: aiSubject || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error || 'AI 生成失败')
        return
      }

      setAiResult(data)
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setAiLoading(false)
    }
  }

  // 图片上传处理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAiImageName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      setAiImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 保存 AI 生成的练习题
  const handleAiSave = async (status: 'draft' | 'approved') => {
    if (!aiResult) {
      showMessage('error', '请先生成练习题')
      return
    }
    if (!aiSubject) {
      showMessage('error', '请选择学科')
      return
    }

    setAiSaving(true)
    try {
      const { data: material, error: matError } = await supabase
        .from('materials')
        .insert({
          subject: aiSubject,
          title: aiResult.title,
          type: 'exercise',
          content: { source: 'ai', ai_mode: aiMode },
          status,
        })
        .select()
        .single()

      if (matError) throw matError

      if (aiResult.exercises.length > 0 && material) {
        const rows = aiResult.exercises.map((e) => ({
          material_id: material.id,
          question: { text: e.question },
          options: e.options,
          correct_answer: e.correct_answer,
          difficulty: e.difficulty,
          knowledge_points: e.knowledge_points,
        }))
        const { error: exError } = await supabase.from('exercises').insert(rows)
        if (exError) throw exError
      }

      showMessage('success', status === 'draft' ? '已保存为草稿' : '已发布')
      setAiResult(null)
      setAiText('')
      setAiImage(null)
      setAiImageName('')
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : '保存失败')
    } finally {
      setAiSaving(false)
    }
  }

  // ============================================
  // 渲染
  // ============================================
  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 导航栏：左侧返回 / 居中标题 / 右侧占位 */}
        <div className="card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/parent"
              className="px-4 py-2 text-sm rounded-soft card border-soft hover:bg-white/90 transition-all"
              style={{ color: '#3A2E2C' }}
            >
              ← 返回
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: '#3A2E2C' }}>
                内容管理
              </h1>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                添加学习资料，支持手动录入、AI 识别和外部资源
              </p>
            </div>
            <div className="w-24" />
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className="mb-6 px-4 py-3 rounded-soft text-sm font-medium"
            style={{
              backgroundColor: message.type === 'success' ? 'rgba(124, 179, 66, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: message.type === 'success' ? '#558B2F' : '#C62828',
            }}
          >
            {message.type === 'success' ? '✓ ' : '✗ '}
            {message.text}
          </div>
        )}

        {/* 标签页切换 */}
        <div className="card rounded-soft p-2 mb-8 flex gap-2">
          {(['upload', 'ai', 'external'] as const).map((tab) => {
            const tabLabels = { upload: '📤 手动上传', ai: '✨ AI 识别', external: '🔗 外部资源' }
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`flex-1 py-3 px-6 rounded-soft transition-all touch-target ${
                  selectedTab === tab ? 'btn-primary text-white' : 'hover:bg-white/90'
                }`}
                style={selectedTab !== tab ? { color: '#3A2E2C' } : {}}
              >
                {tabLabels[tab]}
              </button>
            )
          })}
        </div>

        {/* ============ 手动上传 ============ */}
        {selectedTab === 'upload' && (
          <div className="card rounded-soft p-8 tech-glow">
            <div className="content-z">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#3A2E2C' }}>
                手动上传学习资料
              </h2>

              {/* 学科选择 */}
              <div className="mb-6">
                <label className="block mb-3 font-semibold" style={{ color: '#3A2E2C' }}>
                  选择学科
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(subjectConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setSubject(key)}
                      className={`p-4 rounded-soft card border-2 transition-all ${
                        subject === key ? 'border-amber-400' : 'hover:border-amber-400'
                      }`}
                    >
                      <div className="text-3xl mb-2">{cfg.emoji}</div>
                      <div style={{ color: '#3A2E2C' }}>{cfg.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 标题 */}
              <div className="mb-6">
                <label className="block mb-3 font-semibold" style={{ color: '#3A2E2C' }}>
                  内容标题 <span style={{ color: '#C62828' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：20以内进位加法练习"
                  className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                />
              </div>

              {/* 描述 */}
              <div className="mb-6">
                <label className="block mb-3 font-semibold" style={{ color: '#3A2E2C' }}>
                  内容描述（可选）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="添加关于这个学习内容的说明..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                />
              </div>

              {/* 关联学习目标 */}
              <div className="mb-8">
                <label className="block mb-3 font-semibold" style={{ color: '#3A2E2C' }}>
                  关联学习目标（可选）
                </label>
                {!subject ? (
                  <p className="text-sm" style={{ color: '#8B7355' }}>
                    请先选择学科，然后加载对应的学习目标
                  </p>
                ) : learningGoals.length === 0 ? (
                  <p className="text-sm" style={{ color: '#8B7355' }}>
                    当前学期暂无该学科的学习目标
                  </p>
                ) : (
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                  >
                    <option value="">-- 不关联 --</option>
                    {learningGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        第{g.week_number}周 - {g.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 练习题 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-semibold" style={{ color: '#3A2E2C' }}>
                    练习题（可选）
                  </label>
                  <button
                    onClick={addExercise}
                    className="text-sm px-3 py-1 rounded-soft hover:bg-white/90 transition-all"
                    style={{ color: '#FFB300', border: '1px solid #FFB300' }}
                  >
                    + 添加题目
                  </button>
                </div>

                <div className="space-y-4">
                  {exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-soft border-soft"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm" style={{ color: '#3A2E2C' }}>
                          题目 {idx + 1}
                        </span>
                        {exercises.length > 1 && (
                          <button
                            onClick={() => removeExercise(idx)}
                            className="text-xs px-2 py-1 rounded-soft hover:bg-red-50 transition-all"
                            style={{ color: '#C62828' }}
                          >
                            删除
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={ex.question}
                        onChange={(e) => updateExercise(idx, 'question', e.target.value)}
                        placeholder="题干，例如：8 + 7 = ?"
                        className="w-full px-3 py-2 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm mb-3"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                      />

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={ex.correctAnswer === opt}
                              onChange={() => updateExercise(idx, 'correctAnswer', opt)}
                              className="accent-amber-400"
                            />
                            <input
                              type="text"
                              value={ex[`option${opt}` as keyof ExerciseForm]}
                              onChange={(e) => updateExercise(idx, `option${opt}` as keyof ExerciseForm, e.target.value)}
                              placeholder={`选项 ${opt}`}
                              className="flex-1 px-3 py-2 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#8B7355' }}>难度：</span>
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => updateExercise(idx, 'difficulty', d)}
                            className={`text-xs px-2 py-1 rounded-soft transition-all ${
                              ex.difficulty === d ? difficultyLabels[d].className : 'hover:bg-white/80'
                            }`}
                            style={ex.difficulty !== d ? { color: '#8B7355' } : {}}
                          >
                            {difficultyLabels[d].text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={loading}
                  className="btn-primary flex-1 py-4 text-lg font-semibold text-white rounded-soft touch-target disabled:opacity-50"
                >
                  {loading ? '保存中...' : '保存为草稿'}
                </button>
                <button
                  onClick={() => handleSave('approved')}
                  disabled={loading}
                  className="flex-1 py-4 text-lg font-semibold rounded-soft card border-soft hover:bg-white/90 transition-all touch-target disabled:opacity-50"
                  style={{ color: '#3A2E2C' }}
                >
                  {loading ? '发布中...' : '直接发布'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ AI 识别 ============ */}
        {selectedTab === 'ai' && (
          <div className="rounded-soft p-8 tech-glow" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div className="content-z">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#3A2E2C' }}>
                AI 智能生成
              </h2>

              {/* 学科选择 */}
              <div className="mb-6">
                <label className="block mb-3 font-semibold" style={{ color: '#3A2E2C' }}>
                  选择学科
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(subjectConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setAiSubject(key)}
                      className={`p-3 rounded-soft card border-2 transition-all text-sm ${
                        aiSubject === key ? 'border-amber-400' : 'hover:border-amber-400'
                      }`}
                    >
                      <div className="text-2xl mb-1">{cfg.emoji}</div>
                      <div style={{ color: '#3A2E2C' }}>{cfg.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 输入模式切换 */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => { setAiMode('text'); setAiResult(null); setAiError(null) }}
                    className={`flex-1 py-3 px-4 rounded-soft transition-all text-sm font-medium ${
                      aiMode === 'text' ? 'btn-primary text-white' : 'card border-soft'
                    }`}
                    style={aiMode !== 'text' ? { color: '#3A2E2C' } : {}}
                  >
                    📝 文本输入
                  </button>
                  <button
                    onClick={() => { setAiMode('image'); setAiResult(null); setAiError(null) }}
                    className={`flex-1 py-3 px-4 rounded-soft transition-all text-sm font-medium ${
                      aiMode === 'image' ? 'btn-primary text-white' : 'card border-soft'
                    }`}
                    style={aiMode !== 'image' ? { color: '#3A2E2C' } : {}}
                  >
                    📸 图片识别
                  </button>
                </div>
              </div>

              {/* 文本输入模式 */}
              {aiMode === 'text' && (
                <div className="mb-6">
                  <label className="block mb-2 font-semibold" style={{ color: '#3A2E2C' }}>
                    输入学习内容
                  </label>
                  <p className="text-sm mb-3" style={{ color: '#8B7355' }}>
                    粘贴老师的每日总结、课本内容或学习要点，AI 会自动生成练习题
                  </p>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="例如：&#10;今天数学课学了20以内的退位减法，重点练习：&#10;- 十几减9：15-9=6, 13-9=4&#10;- 十几减8：15-8=7, 12-8=4&#10;- 注意：先想10减几，再加个位数"
                    rows={6}
                    className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                  />
                </div>
              )}

              {/* 图片上传模式 */}
              {aiMode === 'image' && (
                <div className="mb-6">
                  <label className="block mb-2 font-semibold" style={{ color: '#3A2E2C' }}>
                    上传题目图片
                  </label>
                  <p className="text-sm mb-3" style={{ color: '#8B7355' }}>
                    拍摄练习册、课本或作业照片，AI 会自动识别并生成练习题
                  </p>

                  {aiImage ? (
                    <div className="p-4 rounded-soft border-soft mb-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm" style={{ color: '#3A2E2C' }}>
                          📎 {aiImageName}
                        </span>
                        <button
                          onClick={() => { setAiImage(null); setAiImageName('') }}
                          className="text-xs px-2 py-1 rounded-soft"
                          style={{ color: '#C62828' }}
                        >
                          移除
                        </button>
                      </div>
                      <img
                        src={aiImage}
                        alt="上传的图片"
                        className="max-h-48 rounded-soft mx-auto"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <label
                      className="border-2 border-dashed rounded-soft p-12 text-center hover:bg-white/50 transition-all cursor-pointer block"
                      style={{ borderColor: 'rgba(58, 46, 44, 0.2)' }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="text-5xl mb-3">📸</div>
                      <p className="text-lg mb-1" style={{ color: '#3A2E2C' }}>
                        点击上传图片
                      </p>
                      <p className="text-sm" style={{ color: '#8B7355' }}>
                        支持 JPG、PNG，AI 会自动识别题目
                      </p>
                    </label>
                  )}
                </div>
              )}

              {/* 生成按钮 */}
              {!aiResult && (
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="btn-primary w-full py-4 text-lg font-semibold text-white rounded-soft touch-target disabled:opacity-50 mb-6"
                >
                  {aiLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI 生成中...
                    </span>
                  ) : (
                    '✨ AI 生成练习题'
                  )}
                </button>
              )}

              {/* 错误提示 */}
              {aiError && (
                <div className="mb-6 px-4 py-3 rounded-soft text-sm" style={{ backgroundColor: 'rgba(244, 67, 54, 0.15)', color: '#C62828' }}>
                  ✗ {aiError}
                </div>
              )}

              {/* AI 生成结果 */}
              {aiResult && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
                      生成结果 · {aiResult.title}
                    </h3>
                    <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(124, 179, 66, 0.15)', color: '#558B2F' }}>
                      {aiResult.exercises.length} 道题
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {aiResult.exercises.map((ex, idx) => (
                      <div
                        key={ex.id}
                        className="p-4 rounded-soft border-soft animate-list-enter"
                        style={{ '--stagger': `${idx * 60}ms`, backgroundColor: 'rgba(255, 255, 255, 0.6)' } as React.CSSProperties}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-sm font-bold" style={{ color: '#FFB300' }}>{idx + 1}.</span>
                          <span style={{ color: '#3A2E2C' }}>{ex.question}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-5 mb-2">
                          {ex.options.map((opt, oi) => {
                            const letter = String.fromCharCode(65 + oi)
                            const isCorrect = ex.correct_answer === letter
                            return (
                              <span
                                key={oi}
                                className="text-sm px-3 py-1 rounded-soft"
                                style={{
                                  backgroundColor: isCorrect ? 'rgba(124, 179, 66, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                                  color: isCorrect ? '#558B2F' : '#5D4E4A',
                                  fontWeight: isCorrect ? 600 : 400,
                                }}
                              >
                                {letter}. {opt} {isCorrect && '✓'}
                              </span>
                            )
                          })}
                        </div>
                        <div className="flex gap-2 ml-5">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#d97706' }}>
                            {difficultyLabels[ex.difficulty]?.text || '中等'}
                          </span>
                          {ex.knowledge_points?.map((kp, ki) => (
                            <span key={ki} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F' }}>
                              {kp}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAiResult(null); setAiError(null) }}
                      className="flex-1 py-3 rounded-soft card border-soft font-semibold transition-all"
                      style={{ color: '#3A2E2C' }}
                    >
                      重新生成
                    </button>
                    <button
                      onClick={() => handleAiSave('draft')}
                      disabled={aiSaving}
                      className="btn-primary flex-1 py-3 text-white rounded-soft font-semibold disabled:opacity-50"
                    >
                      {aiSaving ? '保存中...' : '保存草稿'}
                    </button>
                    <button
                      onClick={() => handleAiSave('approved')}
                      disabled={aiSaving}
                      className="flex-1 py-3 rounded-soft font-semibold transition-all disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(124, 179, 66, 0.15)', color: '#558B2F' }}
                    >
                      {aiSaving ? '发布中...' : '直接发布'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ 外部资源 ============ */}
        {selectedTab === 'external' && (
          <div className="card rounded-soft p-8 tech-glow">
            <div className="content-z">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#3A2E2C' }}>
                外部数据源
              </h2>

              {/* 已配置的数据源 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#3A2E2C' }}>
                  已配置的数据源
                </h3>

                {dataSources.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: '#8B7355' }}>
                    暂无数据源，点击下方「添加新数据源」开始配置
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dataSources.map((ds) => {
                      const cfg = sourceTypeConfig[ds.type] || { emoji: '📄', label: ds.type, desc: '' }
                      return (
                        <div
                          key={ds.id}
                          className="flex items-center justify-between p-4 rounded-soft card"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{cfg.emoji}</div>
                            <div>
                              <div className="font-semibold" style={{ color: '#3A2E2C' }}>
                                {ds.name}
                              </div>
                              <div className="text-sm" style={{ color: '#8B7355' }}>
                                最后同步：{formatTimeAgo(ds.last_sync_at)}
                              </div>
                              <div className="text-xs mt-1" style={{ color: '#8B7355' }}>
                                类型：{cfg.label} | {ds.url}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleSource(ds)}
                              className={`px-3 py-1 text-sm rounded-full cursor-pointer transition-all ${
                                ds.enabled
                                  ? 'text-green-700'
                                  : 'text-gray-500'
                              }`}
                              style={{
                                backgroundColor: ds.enabled ? 'rgba(124, 179, 66, 0.2)' : 'rgba(158, 158, 158, 0.15)',
                              }}
                            >
                              {ds.enabled ? '已启用' : '已禁用'}
                            </button>
                            <button
                              onClick={() => handleSync(ds.id)}
                              className="px-4 py-2 rounded-soft hover:bg-white/90 transition-all text-sm"
                              style={{ color: '#3A2E2C' }}
                            >
                              立即同步
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 添加新数据源 */}
              <div className="border-2 border-dashed rounded-soft p-6" style={{ borderColor: 'rgba(58, 46, 44, 0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
                    添加新数据源
                  </h3>
                  <button
                    onClick={() => setShowAddSource(!showAddSource)}
                    className="text-sm px-3 py-1 rounded-soft hover:bg-white/90 transition-all"
                    style={{ color: '#FFB300', border: '1px solid #FFB300' }}
                  >
                    {showAddSource ? '收起' : '+ 新增'}
                  </button>
                </div>

                {/* 类型选择 */}
                {!showAddSource && (
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(sourceTypeConfig).map(([key, cfg]) => (
                      <div
                        key={key}
                        className="p-4 rounded-soft card border-soft hover:bg-white/90 transition-all cursor-pointer"
                        onClick={() => {
                          setShowAddSource(true)
                          setNewSource((prev) => ({ ...prev, type: key }))
                        }}
                      >
                        <div className="text-2xl mb-2">{cfg.emoji}</div>
                        <div className="font-semibold text-sm" style={{ color: '#3A2E2C' }}>
                          {cfg.label}
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#8B7355' }}>
                          {cfg.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 添加表单 */}
                {showAddSource && (
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1 text-sm font-medium" style={{ color: '#3A2E2C' }}>
                        名称
                      </label>
                      <input
                        type="text"
                        value={newSource.name}
                        onChange={(e) => setNewSource((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="例如：人民教育出版社资源"
                        className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium" style={{ color: '#3A2E2C' }}>
                        类型
                      </label>
                      <div className="flex gap-3">
                        {Object.entries(sourceTypeConfig).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => setNewSource((prev) => ({ ...prev, type: key }))}
                            className={`flex-1 p-3 rounded-soft card border-2 transition-all text-sm ${
                              newSource.type === key ? 'border-amber-400' : 'hover:border-amber-400'
                            }`}
                          >
                            <span className="mr-1">{cfg.emoji}</span> {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium" style={{ color: '#3A2E2C' }}>
                        URL
                      </label>
                      <input
                        type="url"
                        value={newSource.url}
                        onChange={(e) => setNewSource((prev) => ({ ...prev, url: e.target.value }))}
                        placeholder="https://example.com/feed"
                        className="w-full px-4 py-3 rounded-soft border-soft focus:outline-none focus:ring-2 focus:ring-amber-300"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#3A2E2C' }}
                      />
                    </div>

                    <button
                      onClick={handleAddSource}
                      disabled={loading}
                      className="btn-primary py-3 px-6 text-white rounded-soft font-semibold disabled:opacity-50"
                    >
                      {loading ? '添加中...' : '确认添加'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
