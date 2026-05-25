'use client'

import { FormEvent, useRef, useEffect } from 'react'
import { playTap } from '@/lib/sounds'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  isLoading: boolean
}

/**
 * 对话输入框
 * 自适应高度，支持回车发送，键盘弹起时不被遮挡
 */
export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自适应高度
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) {
        playTap()
        onSubmit(e as unknown as FormEvent)
      }
    }
  }

  return (
    <div
      className="border-t px-4 py-3"
      style={{
        borderColor: 'rgba(58,46,44,0.08)',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="和精灵说说吧..."
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm border-2 focus:outline-none focus:border-amber-400 disabled:opacity-50 transition-colors"
          style={{
            borderColor: 'rgba(58,46,44,0.12)',
            backgroundColor: 'rgba(253,246,227,0.6)',
            color: '#3A2E2C',
            maxHeight: '120px',
          }}
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          onClick={() => playTap()}
          className="btn-primary w-12 h-12 rounded-full flex items-center justify-center text-white text-lg touch-target disabled:opacity-40 flex-shrink-0"
        >
          {isLoading ? '⏳' : '📨'}
        </button>
      </form>
    </div>
  )
}
