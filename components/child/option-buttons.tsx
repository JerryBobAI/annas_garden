'use client'

import { motion } from 'framer-motion'
import { playTap } from '@/lib/sounds'
import { staggerContainer, scaleIn, springBouncy } from '@/lib/animations'

interface OptionButtonsProps {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
}

/**
 * AI 提供的选项按钮
 * 孩子点击后作为消息发送
 * 使用 stagger spring 动画依次弹出
 */
export default function OptionButtons({
  options,
  onSelect,
  disabled = false,
}: OptionButtonsProps) {
  if (!options || options.length === 0) return null

  return (
    <motion.div
      className="flex flex-wrap gap-2 px-4 mb-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {options.map((option, index) => (
        <motion.button
          key={`${option}-${index}`}
          variants={scaleIn}
          transition={springBouncy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            playTap()
            onSelect(option)
          }}
          disabled={disabled}
          className="px-4 py-2 rounded-full text-sm font-medium touch-target border-2 transition-colors disabled:opacity-50"
          style={{
            borderColor: 'rgba(255, 179, 0, 0.4)',
            backgroundColor: 'rgba(255, 179, 0, 0.08)',
            color: '#5D4E4A',
          }}
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  )
}
