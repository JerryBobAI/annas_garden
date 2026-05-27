'use client'

import { motion } from 'framer-motion'
import GardenPlantItem from './garden-plant'
import { getSeasonTheme } from '@/lib/garden/season'
import type { GardenPlant } from '@/lib/garden/growth'

/** 花园区域数据（来自 API） */
export interface GardenAreaData {
  area_name: string
  label: string
  emoji: string
  subject: string | null
  bounds: { x: number; y: number; w: number; h: number }
  bgColor: string
  is_unlocked: boolean
  unlock_progress: number
  unlock_current: number
  unlock_required: number
  unlock_description?: string
}

interface GardenCanvasProps {
  plants: GardenPlant[]
  onPlantClick: (plant: GardenPlant) => void
  newPlantIds?: Set<string>
  areas?: GardenAreaData[]
}

/**
 * 花园画布 — 2D CSS 实现
 * 季节主题背景 + 学科区域分区 + 植物分布 + 动态装饰
 */
export default function GardenCanvas({ plants, onPlantClick, newPlantIds, areas }: GardenCanvasProps) {
  const theme = getSeasonTheme()

  return (
    <div
      className="relative w-full rounded-soft overflow-hidden"
      style={{ height: 360, background: theme.skyGradient }}
    >
      {/* 白云（持续飘动） */}
      <motion.div
        className="absolute top-4 left-[10%] text-3xl opacity-70 pointer-events-none"
        animate={{ x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute top-8 right-[15%] text-2xl opacity-50 pointer-events-none"
        animate={{ x: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>

      {/* 天体（太阳/月亮/日落，随季节变化） */}
      <motion.div
        className="absolute top-3 right-6 text-4xl pointer-events-none"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {theme.celestial}
      </motion.div>

      {/* 季节装饰 */}
      {theme.decorations.map((d, i) => (
        <motion.div
          key={i}
          className={`absolute pointer-events-none ${d.className}`}
          animate={{ y: [0, -5, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {d.emoji}
        </motion.div>
      ))}

      {/* 季节标签 */}
      <div
        className="absolute top-2 left-3 px-2 py-0.5 rounded-full text-xs font-medium pointer-events-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: '#5D4E4A' }}
      >
        {theme.label}
      </div>

      {/* 花园区域分区（G1） */}
      {areas && areas.length > 0 && (
        <div className="absolute inset-0" style={{ top: '30%' }}>
          {areas.map(area => (
            <div
              key={area.area_name}
              className="absolute rounded-lg border border-dashed transition-all"
              style={{
                left: `${area.bounds.x}%`,
                top: `${area.bounds.y}%`,
                width: `${area.bounds.w}%`,
                height: `${area.bounds.h}%`,
                backgroundColor: area.is_unlocked ? area.bgColor : 'rgba(128,128,128,0.15)',
                borderColor: area.is_unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(128,128,128,0.3)',
                opacity: area.is_unlocked ? 1 : 0.6,
              }}
            >
              {/* 区域标签 */}
              <div
                className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  color: area.is_unlocked ? '#5D4E4A' : '#9E9E9E',
                }}
              >
                <span>{area.is_unlocked ? area.emoji : '🔒'}</span>
                <span>{area.label}</span>
              </div>

              {/* 未解锁区域：显示进度 */}
              {!area.is_unlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
                    <span className="text-2xl block mb-1">🔒</span>
                    <p className="text-xs" style={{ color: '#9E9E9E' }}>
                      {area.unlock_description || '继续学习解锁'}
                    </p>
                    {/* 进度条 */}
                    <div className="mt-1 h-1 rounded-full w-16 mx-auto" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${area.unlock_progress * 100}%`,
                          backgroundColor: '#FFB300',
                        }}
                      />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#BDBDBD' }}>
                      {area.unlock_current}/{area.unlock_required}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 植物区域（草地部分） */}
      <div className="absolute inset-0" style={{ top: '30%' }}>
        {plants.map(plant => (
          <GardenPlantItem
            key={plant.id}
            plant={{
              ...plant,
              position_y: Math.min(90, Math.max(5, plant.position_y)),
            }}
            onClick={() => onPlantClick(plant)}
            isNew={newPlantIds?.has(plant.id)}
          />
        ))}
      </div>

      {/* 空花园提示 */}
      {plants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6 py-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.8)' }}>
            <span className="text-3xl block mb-2">🌱</span>
            <p className="text-sm" style={{ color: '#558B2F' }}>
              和精灵聊天学习知识，这里会长出植物哦！
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
