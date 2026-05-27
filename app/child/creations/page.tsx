'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient, getClientUser } from '@/lib/supabase/client'
import type { Creation } from '@/types'

/** 学科筛选选项 */
const FILTERS = [
  { key: 'all', label: '全部', icon: '🎨' },
  { key: 'chinese', label: '故事', icon: '📖' },
  { key: 'math', label: '数学', icon: '🔢' },
  { key: 'english', label: '英语', icon: '🔤' },
]

export default function CreationsPage() {
  const supabase = createClient()
  const [creations, setCreations] = useState<Creation[]>([])
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ story: 0, math: 0, english: 0 })

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const user = await getClientUser()
        if (!user) return

        let query = supabase
          .from('creations')
          .select('*')
          .eq('child_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50)

        if (filter !== 'all') {
          query = query.eq('subject', filter)
        }

        const { data } = await query
        setCreations((data || []) as Creation[])

        // 统计
        const { data: allCreations } = await supabase
          .from('creations')
          .select('subject')
          .eq('child_id', user.id)

        if (allCreations) {
          const rows = allCreations as { subject: string }[]
          setStats({
            story: rows.filter(c => c.subject === 'chinese').length,
            math: rows.filter(c => c.subject === 'math').length,
            english: rows.filter(c => c.subject === 'english').length,
          })
        }
      } catch (err) {
        console.error('Load creations error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  /** 切换收藏 */
  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from('creations').update({ is_favorite: !current }).eq('id', id)
    setCreations(prev => prev.map(c => c.id === id ? { ...c, is_favorite: !current } : c))
  }

  return (
    <div className="container mx-auto px-4 pt-6 pb-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/child" className="text-2xl touch-target">←</Link>
          <h1 className="text-2xl font-bold text-primary-dark">🎨 我的创作</h1>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-target ${
              filter === f.key ? 'text-white' : ''
            }`}
            style={filter === f.key
              ? { background: 'linear-gradient(135deg, #FFB300 0%, #FFA000 100%)' }
              : { color: '#8B7355', background: 'rgba(255,255,255,0.6)' }
            }
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="text-4xl animate-badge-enter">🎨</div>
          <p className="text-muted-brown mt-2">加载中...</p>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && creations.length === 0 && (
        <div className="text-center py-12 animate-card-enter">
          <div className="text-6xl mb-4">✏️</div>
          <p className="text-lg text-primary-dark font-semibold mb-2">还没有创作呢！</p>
          <p className="text-sm text-muted-brown mb-6">和花园精灵一起编故事、做数学、学英语吧</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link
              href="/child/chat?mode=create&subject=chinese"
              className="btn-primary px-6 py-3 text-white rounded-full text-center touch-target"
            >
              📖 编故事
            </Link>
            <Link
              href="/child/chat?mode=create&subject=math"
              className="btn-primary px-6 py-3 text-white rounded-full text-center touch-target"
            >
              🔢 数学探索
            </Link>
            <Link
              href="/child/chat?mode=create&subject=english"
              className="btn-primary px-6 py-3 text-white rounded-full text-center touch-target"
            >
              🔤 英语冒险
            </Link>
          </div>
        </div>
      )}

      {/* 创作网格 */}
      {!isLoading && creations.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {creations.map((creation) => (
            <Link
              key={creation.id}
              href={`/child/creations/${creation.id}`}
              className="block"
            >
              <div className="card rounded-soft p-4 text-center relative animate-card-enter">
                {/* 收藏按钮 */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite(creation.id, creation.is_favorite)
                  }}
                  className="absolute top-2 right-2 text-lg touch-target"
                >
                  {creation.is_favorite ? '❤️' : '🤍'}
                </button>

                {/* 封面 emoji */}
                <div className="text-5xl mb-2">{creation.cover_emoji}</div>

                {/* 标题 */}
                <div className="font-semibold text-sm text-primary-dark line-clamp-2 mb-1">
                  {creation.title}
                </div>

                {/* 状态/信息 */}
                <div className="text-xs text-muted-brown">
                  {creation.status === 'in_progress' && '✏️ 创作中'}
                  {creation.status === 'completed' && `✅ ${creation.word_count} 字`}
                  {creation.status === 'archived' && '📦 已归档'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 统计面板 */}
      {(stats.story > 0 || stats.math > 0 || stats.english > 0) && (
        <div className="card rounded-soft p-4 animate-card-enter">
          <h3 className="text-sm font-semibold text-primary-dark mb-3">📊 创作统计</h3>
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-amber-accent">📖 {stats.story}</div>
              <div className="text-xs text-muted-brown">故事</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-accent">🔢 {stats.math}</div>
              <div className="text-xs text-muted-brown">数学</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-accent">🔤 {stats.english}</div>
              <div className="text-xs text-muted-brown">英语</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
