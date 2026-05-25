'use client'

import { motion } from 'framer-motion'
import { springBouncy } from '@/lib/animations'
import { getPlantEmoji, getPlantSize } from '@/lib/garden/growth'
import type { GardenPlant } from '@/lib/garden/growth'

interface GardenPlantProps {
  plant: GardenPlant
  onClick: () => void
  isNew?: boolean  // 刚种下或刚成长 → 播放动画
}

/**
 * 花园中的单棵植物
 * 根据 plant_type 显示不同 emoji + 尺寸 + 动画
 */
export default function GardenPlantItem({ plant, onClick, isNew }: GardenPlantProps) {
  const emoji = getPlantEmoji(plant.plant_type, plant.subject)
  const size = getPlantSize(plant.plant_type)

  return (
    <motion.button
      className="absolute cursor-pointer select-none"
      style={{
        left: `${plant.position_x}%`,
        top: `${plant.position_y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: size,
      }}
      initial={isNew ? { scale: 0, y: 20, opacity: 0 } : { scale: 1 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={isNew ? springBouncy : { duration: 0 }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={plant.name || '植物'}
    >
      {/* 植物 emoji */}
      <span>{emoji}</span>

      {/* blooming 植物微光效果 */}
      {plant.plant_type === 'blooming' && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,179,0,0.2) 0%, transparent 70%)',
            width: size * 2,
            height: size * 2,
            left: -size / 2,
            top: -size / 2,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* growing 植物轻微摇曳 */}
      {plant.plant_type === 'growing' && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  )
}
