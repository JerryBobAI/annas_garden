'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useFairyChat } from '@/lib/hooks/use-fairy-chat'
import FairyAvatar from '@/components/child/fairy-avatar'
import ChatBubble from '@/components/child/chat-bubble'
import OptionButtons from '@/components/child/option-buttons'
import ChatInput from '@/components/child/chat-input'
import { speakText, getVoiceSettings } from '@/lib/audio-player'
import type { LearningMode } from '@/types'

/** 模式配置 */
const MODE_CONFIG: Record<string, { label: string; icon: string; greeting: string }> = {
  explore: {
    label: '探索模式',
    icon: '🌿',
    greeting: '你好呀！我是花园精灵 ✨ 今天想探索什么有趣的知识呢？可以问我任何问题哦！',
  },
  quest: {
    label: '任务模式',
    icon: '⚔️',
    greeting: '欢迎来到任务挑战！🎯 我来出一些有趣的题目考考你，准备好了吗？',
  },
  create: {
    label: '创造模式',
    icon: '✏️',
    greeting: '太棒了，你选了创造模式！🌈 我们可以一起编故事、画画、做各种有趣的创作！你想从哪里开始？',
  },
}

/**
 * AI 对话页面
 * URL: /child/chat?mode=explore&subject=math&conversationId=xxx
 */
/** 模式 tab 列表 */
const MODE_TABS: { mode: LearningMode; icon: string; label: string }[] = [
  { mode: 'explore', icon: '🌿', label: '探索' },
  { mode: 'quest', icon: '⚔️', label: '任务' },
  { mode: 'create', icon: '✏️', label: '创造' },
]

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen watercolor-bg flex items-center justify-center"><span className="text-4xl animate-badge-enter">🧚</span></div>}>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const searchParams = useSearchParams()

  const urlMode = searchParams.get('mode')
  const savedMode = typeof window !== 'undefined' ? localStorage.getItem('lastChatMode') : null
  const mode = (urlMode || savedMode || 'explore') as LearningMode
  const subject = searchParams.get('subject') || undefined
  const initialConvId = searchParams.get('conversationId') || undefined

  const config = MODE_CONFIG[mode] || MODE_CONFIG.explore

  // 记住最后使用的模式
  useEffect(() => {
    localStorage.setItem('lastChatMode', mode)
  }, [mode])

  const {
    messages,
    emotion,
    options,
    isStreaming,
    isLoading,
    error,
    send,
    retry,
    clearError,
  } = useFairyChat(mode, subject, initialConvId)

  const [input, setInput] = useState('')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recognizing' | 'speaking'>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef(0)

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, options])

  // AI 回复完成后自动播放 TTS
  useEffect(() => {
    const count = messages.length
    if (count > prevMsgCountRef.current && !isStreaming) {
      const lastMsg = messages[count - 1]
      if (lastMsg?.role === 'assistant') {
        const settings = getVoiceSettings()
        if (settings.autoPlay) {
          // 提取纯文本（去除 commands JSON）
          const plainText = lastMsg.content
            .replace(/\[commands:[^\]]*\]/g, '')
            .trim()
          if (plainText) {
            // 异步播放，不阻塞渲染
            void (async () => {
              setVoiceStatus('speaking')
              try { await speakText(plainText, settings) } finally { setVoiceStatus('idle') }
            })()
          }
        }
      }
    }
    prevMsgCountRef.current = count
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isStreaming])

  // 发送消息
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault?.()
    if (!input.trim() || isStreaming) return
    const text = input
    setInput('')
    await send(text)
  }

  // 语音录音完成 → STT → 发送
  // 如果是 browser provider，录音仍然可以发给服务端（如有 API Key）
  // 或者直接用浏览器 STT（参见 voice-button 组件的 onTextResult）
  const handleVoiceRecording = useCallback(async (blob: Blob) => {
    setVoiceStatus('recognizing')
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('language', 'zh')

      const res = await fetch('/api/voice/stt', { method: 'POST', body: formData })
      const data = await res.json()

      // browser provider 返回 400 + provider:'browser'，说明不支持服务端 STT
      if (data.provider === 'browser' || !data.text) {
        setVoiceStatus('idle')
        return
      }

      setInput(data.text)
      setVoiceStatus('idle')
      await send(data.text)
    } catch {
      setVoiceStatus('idle')
    }
  }, [send])

  // 选项按钮点击
  async function handleOptionSelect(option: string) {
    setInput('')
    await send(option)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* 顶栏：返回 + 模式 tab */}
      <header
        className="flex-shrink-0 sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(58,46,44,0.08)',
        }}
      >
        <div className="relative flex h-16 items-center px-4">
          <Link
            href="/child"
            className="absolute left-4 text-2xl touch-target flex items-center justify-center"
            style={{ width: '44px' }}
          >
            ←
          </Link>
          {/* 模式 tab 切换 */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-2">
            {MODE_TABS.map((tab) => {
              const isActive = tab.mode === mode
              const href = `/child/chat?mode=${tab.mode}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`
              return (
                <Link
                  key={tab.mode}
                  href={href}
                  className={`inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full text-sm font-medium leading-none transition-all touch-target whitespace-nowrap ${
                    isActive ? 'text-white' : ''
                  }`}
                  style={isActive
                    ? { background: 'linear-gradient(135deg, #FFB300 0%, #FFA000 100%)' }
                    : { color: '#8B7355' }
                  }
                >
                  {tab.icon} {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* 对话区域 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: '8px' }}
      >
        {/* 精灵头像 */}
        <div className="flex flex-col items-center mb-6 animate-card-enter">
          <FairyAvatar emotion={emotion} size="lg" animated={isStreaming || isLoading} />
          <p className="text-xs text-muted-brown mt-2">花园精灵</p>
        </div>

        {/* 加载中提示 */}
        {isLoading && (
          <div className="text-center text-sm text-muted-brown mb-4 animate-card-enter">
            正在加载对话记录...
          </div>
        )}

        {/* 初始问候（仅在没有历史消息时显示，避免与历史记录重复） */}
        {!isLoading && messages.length === 0 && (
          <ChatBubble
            role="assistant"
            content={config.greeting}
            emotion="happy"
          />
        )}

        {/* 消息列表（历史 + 新消息） */}
        {messages.map((msg, idx) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            emotion={msg.role === 'assistant' ? (msg.commands?.emotion || emotion) : undefined}
            isStreaming={
              msg.role === 'assistant' &&
              idx === messages.length - 1 &&
              isStreaming
            }
          />
        ))}

        {/* 错误提示 */}
        {error && (
          <div className="flex flex-col items-center gap-3 my-4 animate-card-enter">
            <div className="text-center px-6 py-3 rounded-2xl bg-error-soft">
              <p className="text-sm" style={{ color: '#C62828' }}>{error}</p>
            </div>
            <button
              onClick={() => {
                clearError()
                retry()
              }}
              className="btn-primary px-6 py-2 text-white text-sm rounded-full touch-target"
            >
              重新试试 🔄
            </button>
          </div>
        )}

        {/* 选项按钮 */}
        {!isStreaming && options.length > 0 && (
          <OptionButtons
            options={options}
            onSelect={handleOptionSelect}
            disabled={isStreaming}
          />
        )}
      </div>

      {/* 语音状态提示 */}
      {voiceStatus === 'recognizing' && (
        <div className="text-center py-2 text-sm text-muted-brown animate-card-enter">
          👂 精灵在听...
        </div>
      )}
      {voiceStatus === 'speaking' && (
        <div className="text-center py-2 text-sm text-muted-brown animate-card-enter">
          🗣️ 精灵在说话...
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex-shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onVoiceRecording={handleVoiceRecording}
          isLoading={isStreaming}
          voiceEnabled={true}
        />
      </div>
    </div>
  )
}
