'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

const typeLabels: Record<string, string> = {
  rss: 'RSS 订阅',
  api: 'API 接口',
  scrape: '网页抓取',
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [dataSources, setDataSources] = useState<DataSource[]>([])

  // Learning preferences (local state for now)
  const [preferences] = useState({
    dailyGoal: '30 分钟',
    difficulty: '适中',
    reviewFrequency: '每日自动推荐',
  })

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient()

      const { data: sources } = await supabase
        .from('data_sources')
        .select('*')
        .order('created_at', { ascending: true })

      if (sources) {
        setDataSources(sources)
      }

      setLoading(false)
    }

    fetchSettings()
  }, [])

  async function handleSignOut() {
    if (!window.confirm('确定退出登录？')) return
    await supabase.auth.signOut()
    router.replace('/auth/login')
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

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="card rounded-soft p-4 mb-8">
            <div className="flex items-center justify-between content-z">
              <Link href="/parent" className="px-4 py-2 text-sm rounded-xl card border-soft hover:translate-y-0" style={{ color: '#3A2E2C' }}>← 返回</Link>
              <div className="text-center">
                <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>⚙️ 系统设置</h1>
                <p className="text-xs" style={{ color: '#8B7355' }}>配置与偏好</p>
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
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>⚙️ 系统设置</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>配置与偏好</p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* 数据源管理 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter">
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              🔗 数据源管理
            </h2>
            {dataSources.length === 0 ? (
              <div className="p-4 rounded-xl card-alt-bg">
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
                      <div className="font-medium" style={{ color: '#3A2E2C' }}>{source.name}</div>
                      <div className="text-sm" style={{ color: '#8B7355' }}>
                        {typeLabels[source.type] || source.type}
                        {source.last_sync_at && ` · 上次同步: ${formatSyncTime(source.last_sync_at)}`}
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

        {/* 学习偏好 */}
        <div className="card rounded-soft p-6 mb-6 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              🎨 学习偏好
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span style={{ color: '#3A2E2C' }}>每日学习时长目标</span>
                <span className="font-medium" style={{ color: '#FFB300' }}>{preferences.dailyGoal}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span style={{ color: '#3A2E2C' }}>题目难度</span>
                <span className="font-medium" style={{ color: '#FFB300' }}>{preferences.difficulty}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <span style={{ color: '#3A2E2C' }}>错题复习频率</span>
                <span className="font-medium" style={{ color: '#FFB300' }}>{preferences.reviewFrequency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 账号与数据 */}
        <div className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
          <div className="content-z">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👤 账号与数据
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => alert('导出功能开发中，敬请期待')}
                className="w-full text-left p-4 rounded-xl transition-colors cursor-pointer" style={{
                  color: '#3A2E2C',
                  backgroundColor: 'rgba(255,255,255,0.4)',
                }}
              >
                📤 导出学习数据
              </button>
              <button
                onClick={() => alert('导入功能开发中，敬请期待')}
                className="w-full text-left p-4 rounded-xl transition-colors cursor-pointer" style={{
                  color: '#3A2E2C',
                  backgroundColor: 'rgba(255,255,255,0.4)',
                }}
              >
                📥 导入学习数据
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left p-4 rounded-xl transition-colors cursor-pointer"
                style={{
                  color: '#3A2E2C',
                  backgroundColor: 'rgba(255,255,255,0.4)',
                }}
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
