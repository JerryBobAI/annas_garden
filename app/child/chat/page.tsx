'use client'

import { useState, useRef, useEffect, useCallback, Suspense, Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFairyChat } from '@/lib/hooks/use-fairy-chat'
import FairyAvatar from '@/components/child/fairy-avatar'
import { FairySecretHomeWrap } from '@/components/child/fairy-secret-home'
import ChatBubble from '@/components/child/chat-bubble'
import OptionButtons from '@/components/child/option-buttons'
import ChatInput from '@/components/child/chat-input'
import { speakText, getVoiceSettings, stopAllAudio } from '@/lib/audio-player'
import type { LearningMode, Subject } from '@/types'
import ChatDateDivider from '@/components/child/chat-date-divider'
import { formatChatDateDivider, getChatDayKey } from '@/lib/chat-date-label'
import { TabExplore, TabQuest, TabCreate } from '@/components/icons/nav-icons'
import type { ReactNode } from 'react'

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
  // 创造模式学科级配置
  'create:chinese': {
    label: '编故事',
    icon: '📖',
    greeting: '来吧，我们一起编一个有趣的故事！📖 你想讲一个什么样的故事呢？可以是冒险、童话、科幻……你来决定！',
  },
  'create:math': {
    label: '数学探索',
    icon: '🔢',
    greeting: '数学探索时间！🔢 我们用生活中的例子来玩数学，你想探索哪个数学话题呢？',
  },
  'create:english': {
    label: '英语冒险',
    icon: '🔤',
    greeting: 'English Adventure Time! 🔤 我们一起用英语去冒险吧！你想去哪里探险呢？',
  },
}

/**
 * AI 对话页面
 * URL: /child/chat?mode=explore&subject=math&conversationId=xxx
 */
/** 模式 tab 列表 */
const MODE_TABS: { mode: LearningMode; icon: (color: string) => ReactNode; label: string }[] = [
  { mode: 'explore', icon: (c) => <TabExplore color={c} />, label: '探索' },
  { mode: 'quest', icon: (c) => <TabQuest color={c} />, label: '任务' },
  { mode: 'create', icon: (c) => <TabCreate color={c} />, label: '创造' },
]

/** 跳过历史消息加载后的 TTS（模块级变量，避免 React Compiler ref 跨 effect 限制）
 *  初始为 true：首次加载历史也不朗读，问候语由单独的 effect 处理 */
let _skipNextTts = true

/** 创造模式学科子 tab */
const CREATE_SUBJECT_TABS: { subject: Subject; icon: string; label: string }[] = [
  { subject: 'chinese', icon: '📖', label: '故事' },
  { subject: 'math', icon: '🔢', label: '数学' },
  { subject: 'english', icon: '🔤', label: '英语' },
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
  const rawSubject = searchParams.get('subject') || undefined
  // 创造模式必须有学科：优先 URL 参数 > localStorage 记忆 > 默认故事
  const savedSubject = typeof window !== 'undefined' ? localStorage.getItem('lastCreateSubject') : null
  const subject = mode === 'create' ? (rawSubject || savedSubject || 'chinese') : rawSubject
  const initialConvId = searchParams.get('conversationId') || undefined
  const topic = searchParams.get('topic')?.trim() || undefined

  // 创造模式下使用学科级配置，否则用模式级配置
  const configKey = mode === 'create' && subject ? `create:${subject}` : mode
  const config = MODE_CONFIG[configKey] || MODE_CONFIG[mode] || MODE_CONFIG.explore

  const router = useRouter()
  const [input, setInput] = useState('')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recognizing' | 'speaking'>('idle')
  const [voiceProvider, setVoiceProvider] = useState<string>('server')
  const [voiceNotice, setVoiceNotice] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef(0)
  const topicSentRef = useRef<string | null>(null)

  // 记住最后使用的模式和学科
  useEffect(() => {
    localStorage.setItem('lastChatMode', mode)
    if (mode === 'create' && subject) {
      localStorage.setItem('lastCreateSubject', subject)
    }
  }, [mode, subject])

  // 切换模式/学科时停止旧音频，跳过历史 TTS（问候语由单独 effect 处理）
  useEffect(() => {
    stopAllAudio()
    _skipNextTts = true
  }, [mode, subject])

  const {
    messages,
    emotion,
    options,
    isStreaming,
    isLoading,
    error,
    latestCreationId,
    imageMap,
    imageLoadingMap,
    imageErrorMap,
    send,
    retry,
    clearError,
  } = useFairyChat(mode, subject, initialConvId)

  // 从首页推荐进入时，自动发起对应知识点的学习
  useEffect(() => {
    if (!topic || isLoading || isStreaming || messages.length > 0) return

    const key = `${mode}:${subject || ''}:${topic}`
    if (topicSentRef.current === key) return
    topicSentRef.current = key

    const prompt =
      mode === 'quest'
        ? `请帮我练习「${topic}」相关的题目`
        : mode === 'create'
          ? `我想创作和「${topic}」有关的内容`
          : `我想了解「${topic}」`

    void send(prompt)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('topic')
    const query = params.toString()
    router.replace(query ? `/child/chat?${query}` : '/child/chat', { scroll: false })
  }, [topic, mode, subject, isLoading, isStreaming, messages.length, send, router, searchParams])

  useEffect(() => {
    let cancelled = false
    async function loadVoiceProvider() {
      try {
        const res = await fetch('/api/voice/provider')
        const data = await res.json()
        if (!cancelled) setVoiceProvider(data.provider || 'server')
      } catch {
        if (!cancelled) setVoiceProvider('server')
      }
    }
    loadVoiceProvider()
    return () => { cancelled = true }
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, options])

  // 初始问候语 TTS（greeting 是纯 JSX，不在 messages 里，需单独朗读）
  // 依赖 isLoading + messages.length + config.greeting，切学科后 greeting 变化也能正确朗读
  useEffect(() => {
    if (!isLoading && messages.length === 0 && config.greeting && !topic) {
      const settings = getVoiceSettings()
      if (settings.autoPlay) {
        void (async () => {
          setVoiceStatus('speaking')
          try {
            await speakText(config.greeting, settings)
          } catch (err) {
            console.warn('TTS 问候语播放失败:', err)
          } finally {
            setVoiceStatus('idle')
          }
        })()
      }
    }
  }, [isLoading, messages.length, config.greeting, topic])

  // AI 回复完成后自动播放 TTS
  useEffect(() => {
    const count = messages.length
    // 切换学科后加载历史消息时跳过 TTS
    if (_skipNextTts) {
      _skipNextTts = false
      prevMsgCountRef.current = count
      return
    }
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
              try {
                await speakText(plainText, settings)
              } catch (err) {
                console.warn('TTS 播放失败:', err)
              } finally {
                setVoiceStatus('idle')
              }
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
    setVoiceNotice('')
    try {
      if (voiceProvider === 'browser') {
        setVoiceStatus('idle')
        setVoiceNotice('当前浏览器语音模式会直接识别麦克风声音，请按住语音按钮说话后松开。')
        return
      }

      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('language', 'zh')

      const res = await fetch('/api/voice/stt', { method: 'POST', body: formData })
      const data = await res.json()

      // browser provider 返回 400 + provider:'browser'，说明不支持服务端 STT
      if (data.provider === 'browser' || !data.text) {
        setVoiceStatus('idle')
        setVoiceNotice('当前浏览器不支持服务端语音识别，请使用支持 Web Speech API 的 Chrome 或 Edge。')
        return
      }

      setInput(data.text)
      setVoiceStatus('idle')
      await send(data.text)
    } catch {
      setVoiceStatus('idle')
      setVoiceNotice('精灵暂时没有听清楚，请再试一次。')
    }
  }, [send, voiceProvider])

  const handleBrowserVoiceText = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setVoiceNotice('')
    setInput(trimmed)
    setVoiceStatus('idle')
    await send(trimmed)
  }, [isStreaming, send])

  // 选项按钮点击
  async function handleOptionSelect(option: string) {
    setInput('')
    await send(option)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none">
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
          {/* 模式 tab 切换：始终显示探索/任务/创造 */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-2">
            {MODE_TABS.map((tab) => {
              const isActive = tab.mode === mode
              const href = tab.mode === 'create'
                ? `/child/chat?mode=create&subject=${subject || 'chinese'}`
                : `/child/chat?mode=${tab.mode}`
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
                  {tab.icon(isActive ? '#fff' : '#8B7355')} {tab.label}
                </Link>
              )
            })}
          </div>
          {/* 精灵头像：右上角，与首页保持一致 */}
          <FairySecretHomeWrap className="absolute right-4 flex items-center gap-1.5">
            <FairyAvatar emotion={emotion} size="sm" animated={isStreaming || isLoading} smoothSwitch />
          </FairySecretHomeWrap>
        </div>
      </header>

      {/* 对话区域 */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
        style={{ paddingBottom: '24px', WebkitOverflowScrolling: 'touch' }}
      >
        {/* 创造模式：悬浮学科按钮 */}
        {mode === 'create' && (
          <div className="flex items-center justify-center gap-2 mb-4 animate-card-enter">
            {CREATE_SUBJECT_TABS.map((tab) => {
              const isActive = tab.subject === subject
              return (
                <button
                  key={tab.subject}
                  onClick={() => {
                    if (!isActive) {
                      router.replace(`/child/chat?mode=create&subject=${tab.subject}`)
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-target whitespace-nowrap ${
                    isActive ? 'text-white shadow-sm scale-105' : 'bg-white/60 hover:bg-white/80'
                  }`}
                  style={isActive
                    ? { background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)' }
                    : { color: '#5D4037', border: '1px solid rgba(58,46,44,0.12)' }
                  }
                >
                  {tab.icon} {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 加载中提示 */}
        {isLoading && (
          <div className="text-center text-sm text-muted-brown mb-4 animate-card-enter">
            正在加载对话记录...
          </div>
        )}

        {/* 模式问候语（始终作为对话第一条气泡） */}
        {!isLoading && (
          <ChatBubble
            role="assistant"
            content={config.greeting}
            emotion="happy"
          />
        )}

        {/* 消息列表（历史 + 新消息，跨天显示日期分割线） */}
        {messages.map((msg, idx) => {
          const prevDay = idx > 0 ? getChatDayKey(messages[idx - 1].createdAt) : null
          const thisDay = getChatDayKey(msg.createdAt)
          const showDateDivider = idx === 0 || prevDay !== thisDay

          return (
            <Fragment key={msg.id}>
              {showDateDivider && (
                <ChatDateDivider label={formatChatDateDivider(msg.createdAt || new Date().toISOString())} />
              )}
              <ChatBubble
                role={msg.role}
                content={msg.content}
                emotion={msg.role === 'assistant' ? (msg.commands?.emotion || emotion) : undefined}
                isStreaming={
                  msg.role === 'assistant' &&
                  idx === messages.length - 1 &&
                  isStreaming
                }
                imageUrl={
                  msg.role === 'assistant'
                    ? (imageMap[msg.id] ?? msg.commands?.image_url)
                    : undefined
                }
                imagePrompt={msg.role === 'assistant' ? msg.commands?.illustration_prompt : undefined}
                imageLoading={msg.role === 'assistant' ? !!imageLoadingMap[msg.id] : false}
                imageError={msg.role === 'assistant' ? imageErrorMap[msg.id] : null}
              />
            </Fragment>
          )
        })}

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

        {mode === 'create' && latestCreationId && (
          <div className="flex justify-center my-4 animate-card-enter">
            <Link
              href={`/child/creations/${latestCreationId}`}
              className="btn-primary px-5 py-2.5 text-white text-sm rounded-full touch-target"
            >
              📖 查看创作
            </Link>
          </div>
        )}
      </div>

      {/* 语音状态提示 */}
      {voiceNotice && (
        <div className="text-center py-2 px-4 text-sm text-muted-brown animate-card-enter">
          {voiceNotice}
        </div>
      )}
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

      {/* 输入区域 — 固定在聊天容器底部，不参与页面级滚动 */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: 'rgba(58,46,44,0.08)' }}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onVoiceRecording={handleVoiceRecording}
          onVoiceTextResult={handleBrowserVoiceText}
          voiceProvider={voiceProvider}
          isLoading={isStreaming}
          voiceEnabled={true}
        />
      </div>
    </div>
  )
}
