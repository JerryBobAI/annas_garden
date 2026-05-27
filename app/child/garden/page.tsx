'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient, getClientUser } from '@/lib/supabase/client'
import { StickyHeader } from '@/components/shared/sticky-header'
import GardenCanvas from '@/components/child/garden-canvas'
import type { GardenAreaData } from '@/components/child/garden-canvas'
import PlantDetail from '@/components/child/plant-detail'
import { getPlantEmoji } from '@/lib/garden/growth'
import { getSeasonTheme } from '@/lib/garden/season'
import type { GardenPlant } from '@/lib/garden/growth'

type SubjectFilter = 'all' | 'math' | 'chinese' | 'english'
type GardenPlantWithConversation = GardenPlant & {
  source_mode?: string | null
  source_subject?: SubjectFilter | null
}

const SUBJECT_FILTERS: { value: SubjectFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'math', label: '🌻 数学' },
  { value: 'chinese', label: '🌸 语文' },
  { value: 'english', label: '🌼 英语' },
]

export default function GardenPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [plants, setPlants] = useState<GardenPlantWithConversation[]>([])
  const [selectedPlant, setSelectedPlant] = useState<GardenPlantWithConversation | null>(null)
  const [filter, setFilter] = useState<SubjectFilter>('all')
  const [stats, setStats] = useState({ total: 0, seed: 0, sprout: 0, growing: 0, blooming: 0 })
  const [areas, setAreas] = useState<GardenAreaData[]>([])
  const seasonTheme = getSeasonTheme()

  // 加载花园数据
  const fetchGardenData = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getClientUser()
      if (!user) { setLoading(false); return }

      // 并行加载植物 + 区域
      const [plantsResult, areasResult] = await Promise.all([
        supabase
          .from('garden_plants')
          .select('*')
          .eq('child_id', user.id)
          .order('created_at', { ascending: false }),
        fetch('/api/garden/areas').then(r => r.ok ? r.json() : null),
      ])

      if (plantsResult.error) {
        console.error('Garden fetch error:', plantsResult.error)
        setLoading(false)
        return
      }

      // 设置区域数据
      if (areasResult?.areas) {
        setAreas(areasResult.areas)
      }

      const allPlants = (plantsResult.data || []) as GardenPlantWithConversation[]
      const conversationIds = Array.from(new Set(
        allPlants.map(p => p.source_conversation_id).filter(Boolean) as string[],
      ))

      if (conversationIds.length > 0) {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, mode, subject')
          .in('id', conversationIds)

        const conversationMap = new Map<string, { mode: string; subject: string }>(
          ((conversations || []) as { id: string; mode: string; subject: string }[]).map(c => [
            c.id,
            { mode: c.mode, subject: c.subject },
          ]),
        )

        for (const plant of allPlants) {
          const source = plant.source_conversation_id
            ? conversationMap.get(plant.source_conversation_id)
            : null
          plant.source_mode = source?.mode || null
          plant.source_subject = (source?.subject as SubjectFilter | undefined) ?? null
        }
      }

      setPlants(allPlants)

      // 统计各阶段
      setStats({
        total: allPlants.length,
        seed: allPlants.filter(p => p.plant_type === 'seed').length,
        sprout: allPlants.filter(p => p.plant_type === 'sprout').length,
        growing: allPlants.filter(p => p.plant_type === 'growing').length,
        blooming: allPlants.filter(p => p.plant_type === 'blooming').length,
      })
    } catch (error) {
      console.error('Error fetching garden data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // 异步加载不阻塞渲染
    void Promise.resolve().then(fetchGardenData)
  }, [fetchGardenData])

  // 按学科筛选
  const filteredPlants = filter === 'all'
    ? plants
    : plants.filter(p => p.subject === filter)

  if (loading) {
    return (
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌻</div>
          <div className="text-lg" style={{ color: '#8B7355' }}>加载花园中...</div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen watercolor-bg">
      <StickyHeader
        subtitle="成长花园"
        title="🏡 我的花园"
        right={<span className="text-xl">🌻</span>}
      />

      <div className="container mx-auto px-4">
        {/* 季节氛围 */}
        <div className="text-center text-xs mb-2 animate-card-enter" style={{ color: '#8B7355' }}>
          {seasonTheme.mood}
        </div>

        {/* 花园画布 */}
        <div className="mb-6 animate-card-enter">
          <GardenCanvas
            plants={filteredPlants}
            onPlantClick={setSelectedPlant}
            areas={areas}
          />
        </div>

        {/* 学科筛选 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {SUBJECT_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-target"
              style={{
                backgroundColor: filter === f.value ? '#FFB300' : 'rgba(255,179,0,0.1)',
                color: filter === f.value ? '#fff' : '#8B7355',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 花园统计 */}
        <div className="card rounded-soft p-5 mb-6 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#5D4E4A' }}>📊 花园概况</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-2xl">🌰</div>
              <div className="text-lg font-bold" style={{ color: '#8B7355' }}>{stats.seed}</div>
              <div className="text-xs text-muted-brown">种子</div>
            </div>
            <div>
              <div className="text-2xl">🌱</div>
              <div className="text-lg font-bold" style={{ color: '#7CB342' }}>{stats.sprout}</div>
              <div className="text-xs text-muted-brown">嫩芽</div>
            </div>
            <div>
              <div className="text-2xl">🌿</div>
              <div className="text-lg font-bold" style={{ color: '#558B2F' }}>{stats.growing}</div>
              <div className="text-xs text-muted-brown">成长中</div>
            </div>
            <div>
              <div className="text-2xl">🌸</div>
              <div className="text-lg font-bold" style={{ color: '#FFB300' }}>{stats.blooming}</div>
              <div className="text-xs text-muted-brown">已开花</div>
            </div>
          </div>
        </div>

        {/* 植物列表 */}
        <div className="card rounded-soft p-5 mb-8 pb-4 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#5D4E4A' }}>
            🪴 植物列表（{filteredPlants.length}）
          </h3>
          {filteredPlants.length === 0 ? (
            <div className="text-center py-8 text-muted-brown text-sm">
              还没有植物，和精灵聊天学习知识就会长出来哦！
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlants.slice(0, 10).map(plant => (
                <button
                  key={plant.id}
                  onClick={() => setSelectedPlant(plant)}
                  className="w-full flex items-center gap-3 p-3 rounded-soft transition-colors hover:bg-amber-50 text-left"
                >
                  <span className="text-2xl">{getPlantEmoji(plant.plant_type, plant.subject)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#3A2E2C' }}>
                      {plant.name || '未命名植物'}
                    </div>
                    <div className="text-xs text-muted-brown">
                      {plant.knowledge_tags?.[0] || '知识点'}
                    </div>
                  </div>
                  <div className="w-16">
                    <div className="h-1.5 rounded-full bg-progress-track">
                      <div
                        className="h-full rounded-full bg-progress-fill"
                        style={{ width: `${plant.growth_stage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-brown text-right mt-0.5">
                      {plant.growth_stage}%
                    </div>
                  </div>
                </button>
              ))}
              {filteredPlants.length > 10 && (
                <div className="text-center text-xs text-muted-brown pt-2">
                  还有 {filteredPlants.length - 10} 棵植物...
                </div>
              )}
            </div>
          )}
        </div>
        {/* 为底部固定导航留出可滚动空白，避免最后一项被遮挡 */}
        <div className="h-24" aria-hidden="true" />
      </div>

      {/* 植物详情弹窗 */}
      <PlantDetail
        plant={selectedPlant}
        onClose={() => setSelectedPlant(null)}
      />
    </div>
  )
}
