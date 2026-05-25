'use client'

import { motion } from 'framer-motion'
import GardenPlantItem from './garden-plant'
import type { GardenPlant } from '@/lib/garden/growth'

interface GardenCanvasProps {
  plants: GardenPlant[]
  onPlantClick: (plant: GardenPlant) => void
  newPlantIds?: Set<string>
}

/**
 * 花园画布 — 2D CSS 实现
 * 草地背景 + 植物按位置分布 + 白云装饰
 */
export default function GardenCanvas({ plants, onPlantClick, newPlantIds }: GardenCanvasProps) {
  return (
    <div
      className="relative w-full rounded-soft overflow-hidden"
      style={{
        height: 320,
        background: 'linear-gradient(180deg, #87CEEB 0%, #B5E8CC 30%, #7CB342 60%, #558B2F 100%)',
      }}
    >
      {/* 白云装饰 */}
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

      {/* 太阳 */}
      <motion.div
        className="absolute top-3 right-6 text-4xl pointer-events-none"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☀️
      </motion.div>

      {/* 植物区域（草地部分 40%-100%） */}
      <div className="absolute inset-0" style={{ top: '35%' }}>
        {plants.map(plant => (
          <GardenPlantItem
            key={plant.id}
            plant={{
              ...plant,
              // 将 position_y 映射到草地区域内
              position_y: Math.min(90, Math.max(10, plant.position_y)),
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
