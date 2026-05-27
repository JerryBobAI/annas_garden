'use client'

import { useEffect, useState } from 'react'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { useRouter } from 'next/navigation'
import { createClient, getClientUser } from '@/lib/supabase/client'

interface DataSource {
  id: string
  name: string
  type: 'rss' | 'api' | 'scrape'
  url: string
  config: Record<string, unknown>
  enabled: boolean
  last_sync_at: string | null
  created_at: string
}

// Phase 4: 认知档案
interface CognitiveProfile {
  preferred_mode: string
  attention_span_avg: number
  interests: string[]
  total_conversations: number
  total_messages: number
}

const typeLabels: Record<string, string> = {
  rss: 'RSS 订阅',
  api: 'API 接口',
  scrape: '网页抓取',
}

const modeLabels: Record<string, string> = {
  explore: '🌍 探索模式',
  quest: '⚔️ 任务模式',
  create: '🎨 创造模式',
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [exporting, setExporting] = useState(false)
  // Phase 4: 认知档案
  const [cognitive, setCognitive] = useState<CognitiveProfile | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  // AI 配置状态
  const [aiProvider, setAiProvider] = useState<string>('unknown')

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient()
      const user = await getClientUser()
      if (!user) { setLoading(false); return }

      // 定位孩子 ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let cId = user.id
      if (profile?.role === 'parent') {
        const { data: children } = await supabase
          .from('profiles')
          .select('id')
          .eq('parent_id', user.id)
          .eq('role', 'child')
          .limit(1)
        if (children?.[0]) cId = children[0].id
      }
      setChildId(cId)

      // 并行获取数据
      const [sourcesRes, cogRes] = await Promise.all([
        supabase
          .from('data_sources')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('cognitive_profiles')
          .select('preferred_mode, attention_span_avg, interests, total_conversations, total_messages')
          .eq('child_id', cId)
          .single(),
      ])

      if (sourcesRes.data) setDataSources(sourcesRes.data)
      if (cogRes.data) setCognitive(cogRes.data as CognitiveProfile)

      // 查询 AI Provider
      try {
        const provRes = await fetch('/api/voice/provider')
        if (provRes.ok) {
          const provData = await provRes.json()
          setAiProvider(provData.provider || 'glm')
        }
      } catch { setAiProvider('glm') }

      setLoading(false)
    }

    fetchSettings()
  }, [])

  async function handleSignOut() {
    if (!window.confirm('确定退出登录？')) return
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  // Phase 4: 真实数据导出功能
  async function handleExport() {
    if (!childId) return
    setExporting(true)
    try {
      const supabase = createClient()
      const [convRes, masteryRes, plantsRes, recordsRes] = await Promise.all([
        supabase.from('conversations').select('*').eq('child_id', childId),
        supabase.from('knowledge_mastery').select('*').eq('child_id', childId),
        supabase.from('garden_plants').select('*').eq('child_id', childId),
        supabase.from('learning_records').select('*').eq('child_id', childId),
      ])

      const exportError =
        convRes.error?.message ||
        masteryRes.error?.message ||
        plantsRes.error?.message ||
        recordsRes.error?.message
      if (exportError) {
        throw new Error(exportError)
      }

      const exportData = {
        exported_at: new Date().toISOString(),
        child_id: childId,
        conversations: convRes.data || [],
        knowledge_mastery: masteryRes.data || [],
        garden_plants: plantsRes.data || [],
        learning_records: recordsRes.data || [],
      }

      // 下载 JSON 文件
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `annas-garden-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert('导出失败，请稍后重试')
    }
    setExporting(false)
  }

  function formatSyncTime(iso: string | null) {
    if (!iso) return '从未同步'
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前`
  }

  // 导航头
  const navHeader = (
    <div className="card rounded-soft p-4 mb-8">
      <div className="flex items-center justify-between content-z">
        <BackIconLink href="/parent" label="返回家长中心" />
        <div className="text-center">
          <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>⚙️ 系统设置</h1>
          <p className="text-xs" style={{ color: '#8B7355' }}>认知档案 · AI 配置 · 数据管理</p>
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

        {/* Phase 4: 认知档案 */}
        {cognitive ? (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter">
            <div className="content-z">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
                🧒 认知档案
              </h2>
              <p className="text-xs mb-4" style={{ color: '#8B7355' }}>
                AI 根据学习行为自动分析生成，无需手动设置
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.06)' }}>
                  <div className="text-xs mb-1" style={{ color: '#8B7355' }}>偏好模式</div>
                  <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                    {modeLabels[cognitive.preferred_mode] || cognitive.preferred_mode}
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.06)' }}>
                  <div className="text-xs mb-1" style={{ color: '#8B7355' }}>平均专注时长</div>
                  <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                    {Math.round(cognitive.attention_span_avg / 60)} 分钟
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.06)' }}>
                  <div className="text-xs mb-1" style={{ color: '#8B7355' }}>累计对话</div>
                  <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                    {cognitive.total_conversations} 次
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,179,0,0.06)' }}>
                  <div className="text-xs mb-1" style={{ color: '#8B7355' }}>累计消息</div>
                  <div className="text-sm font-medium" style={{ color: '#3A2E2C' }}>
                    {cognitive.total_messages} 条
                  </div>
                </div>
              </div>
              {/* 兴趣标签 */}
              {cognitive.interests && cognitive.interests.length > 0 && (
                <div>
                  <div className="text-xs mb-2" style={{ color: '#8B7355' }}>兴趣标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cognitive.interests.slice(0, 10).map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{
                        backgroundColor: 'rgba(255,179,0,0.1)',
                        color: '#d97706',
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter">
            <div className="content-z">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#3A2E2C' }}>
                🧒 认知档案
              </h2>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                完成几次对话后，AI 会自动生成认知档案
              </p>
            </div>
          </div>
        )}

        {/* AI 配置状态 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '60ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              🤖 AI 配置
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span className="text-sm" style={{ color: '#3A2E2C' }}>对话模型</span>
                <span className="text-sm font-medium" style={{ color: '#FFB300' }}>智谱 GLM-4</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span className="text-sm" style={{ color: '#3A2E2C' }}>语音引擎</span>
                <span className="text-sm font-medium" style={{ color: '#FFB300' }}>
                  {aiProvider === 'siliconflow' ? 'SiliconFlow' : aiProvider === 'openai' ? 'OpenAI' : '浏览器原生'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span className="text-sm" style={{ color: '#3A2E2C' }}>自适应难度</span>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  color: '#16a34a',
                }}>已启用</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span className="text-sm" style={{ color: '#3A2E2C' }}>认知档案自动更新</span>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  color: '#16a34a',
                }}>已启用</span>
              </div>
            </div>
          </div>
        </div>

        {/* 数据源管理 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '120ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              📡 数据源管理
            </h2>
            {dataSources.length === 0 ? (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <p className="text-sm" style={{ color: '#8B7355' }}>暂无已配置的数据源</p>
                <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                  可在「内容管理」中添加外部数据源，系统将自动同步学习资源
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dataSources.map((source) => (
                  <div key={source.id} className="flex justify-between items-center p-4 rounded-xl" style={{
                    backgroundColor: source.enabled ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${source.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(139,115,85,0.1)'}`,
                  }}>
                    <div>
                      <div className="font-medium text-sm" style={{ color: '#3A2E2C' }}>{source.name}</div>
                      <div className="text-xs" style={{ color: '#8B7355' }}>
                        {typeLabels[source.type] || source.type}
                        {source.last_sync_at && ` · 上次: ${formatSyncTime(source.last_sync_at)}`}
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full" style={{
                      backgroundColor: source.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)',
                      color: source.enabled ? '#16a34a' : '#6b7280',
                    }}>
                      {source.enabled ? '已启用' : '未启用'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 账号与数据 */}
        <div className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': '180ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👤 账号与数据
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full text-left p-4 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                style={{ color: '#3A2E2C', backgroundColor: 'rgba(255,255,255,0.4)' }}
              >
                <span>📤 导出学习数据</span>
                {exporting ? (
                  <span className="text-xs" style={{ color: '#8B7355' }}>导出中...</span>
                ) : (
                  <span className="text-xs" style={{ color: '#8B7355' }}>JSON 格式</span>
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left p-4 rounded-xl transition-colors cursor-pointer"
                style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.04)' }}
              >
                🚪 退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
