'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FairyEmotion } from '@/types'
import { emotionSwitch, springSnappy } from '@/lib/animations'

interface FairyAvatarProps {
  emotion: FairyEmotion
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

/**
 * 花园精灵头像
 * 根据情绪显示不同 emoji
 * 使用 AnimatePresence 实现平滑切换过渡
 */

const EMOTION_MAP: Record<FairyEmotion, string> = {
  happy: '😊',
  thinking: '🤔',
  surprised: '😲',
  cheering: '🎉',
}

const SIZE_MAP = {
  sm: 'text-3xl w-10 h-10',
  md: 'text-5xl w-14 h-14',
  lg: 'text-7xl w-20 h-20',
}

export default function FairyAvatar({
  emotion,
  size = 'md',
  animated = true,
}: FairyAvatarProps) {
  const emoji = EMOTION_MAP[emotion]

  return (
    <div className={`relative flex items-center justify-center rounded-full bg-amber-soft ${SIZE_MAP[size]}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={emotion}
          variants={emotionSwitch}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={springSnappy}
          className="inline-block"
          style={{ lineHeight: 1 }}
        >
          {emoji}
        </motion.span>
      </AnimatePresence>
      {/* 思考中持续呼吸动画 */}
      {animated && emotion === 'thinking' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-amber-300/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
