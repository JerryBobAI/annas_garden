'use client'

import { motion } from 'framer-motion'
import { FairyEmotion } from '@/types'
import { bubbleAssistant, bubbleUser, springGentle } from '@/lib/animations'
import FairyAvatar from './fairy-avatar'
import ChatImage from './chat-image'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  emotion?: FairyEmotion
  isStreaming?: boolean
  imageUrl?: string
  imagePrompt?: string
  imageLoading?: boolean
  imageError?: string | null
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
  imageUrl,
  imagePrompt,
  imageLoading = false,
  imageError = null,
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
        {/* 等待首 token 时显示思考动画 */}
        {isStreaming && !content ? (
          <span className="text-muted-brown animate-hint-pulse">精灵在想...</span>
        ) : (
          <>
            {content}
            {isStreaming && (
              <span className="inline-block ml-1 animate-hint-pulse">▍</span>
            )}
          </>
        )}
        {isAssistant && imageLoading && (
          <p className="mt-2 text-xs text-muted-brown animate-hint-pulse origin-left">精灵在画画…</p>
        )}
        {isAssistant && imageUrl && (
          <ChatImage url={imageUrl} prompt={imagePrompt} />
        )}
        {isAssistant && !imageUrl && imageError && (
          <p className="mt-2 text-xs" style={{ color: '#C62828' }}>{imageError}</p>
        )}
      </div>
    </motion.div>
  )
}
