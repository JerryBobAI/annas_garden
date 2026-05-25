'use client'

import { motion } from 'framer-motion'
import { FairyEmotion } from '@/types'
import { bubbleAssistant, bubbleUser, springGentle } from '@/lib/animations'
import FairyAvatar from './fairy-avatar'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  emotion?: FairyEmotion
  isStreaming?: boolean
}

/**
 * 对话气泡组件
 * 精灵消息靠左（浅绿），孩子消息靠右（浅蓝）
 * 使用 framer-motion spring 物理弹性动画
 */
export default function ChatBubble({
  role,
  content,
  emotion = 'happy',
  isStreaming = false,
}: ChatBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <motion.div
      className={`flex gap-2 mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
      initial="hidden"
      animate="visible"
      variants={isAssistant ? bubbleAssistant : bubbleUser}
      transition={springGentle}
    >
      {/* 精灵头像（仅 assistant） */}
      {isAssistant && (
        <div className="flex-shrink-0 mt-1">
          <FairyAvatar emotion={emotion} size="sm" animated={isStreaming} />
        </div>
      )}

      {/* 气泡 */}
      <div
        className={`px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
          isAssistant ? 'bubble-assistant' : 'bubble-user'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="inline-block ml-1 animate-hint-pulse">▍</span>
        )}
      </div>
    </motion.div>
  )
}
