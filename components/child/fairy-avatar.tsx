'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FairyEmotion } from '@/types'
import { emotionSwitch, springSnappy } from '@/lib/animations'
import FairyFaceSVG from './fairy-face-svg'

interface FairyAvatarProps {
  emotion: FairyEmotion
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  /** 平滑切换情绪（不触发 exit/enter 闪烁），适合 header 小头像 */
  smoothSwitch?: boolean
}

/**
 * 花园精灵头像
 * 使用 SVG 矢量角色，根据情绪显示不同表情
 * 带呼吸、眨眼 CSS 动画 + framer-motion 切换过渡
 */

const SIZE_PX = {
  sm: 40,
  md: 56,
  lg: 80,
}

const SIZE_CLASS = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
}

export default function FairyAvatar({
  emotion,
  size = 'md',
  animated = true,
  smoothSwitch = false,
}: FairyAvatarProps) {
  return (
    <div className={`relative flex items-center justify-center rounded-full ${SIZE_CLASS[size]} ${animated ? 'fairy-breathing' : ''}`}>
      {smoothSwitch ? (
        /* 平滑模式：无 exit/enter 动画，直接渲染当前情绪 */
        <motion.div
          className="inline-flex"
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <FairyFaceSVG emotion={emotion} size={SIZE_PX[size]} />
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={emotion}
            variants={emotionSwitch}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springSnappy}
            className="inline-flex"
          >
            <FairyFaceSVG emotion={emotion} size={SIZE_PX[size]} />
          </motion.div>
        </AnimatePresence>
      )}
      {/* 思考中持续呼吸光环 */}
      {animated && emotion === 'thinking' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-amber-300/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* 欢呼时发光效果 */}
      {animated && emotion === 'cheering' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,179,0,0.3) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
