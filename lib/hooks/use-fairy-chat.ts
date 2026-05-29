'use client'

import { useState, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { parseAIResponse } from '@/lib/ai/structured-output'
import { createClient, getClientUser } from '@/lib/supabase/client'
import { startWaitingSound, stopWaitingSound } from '@/lib/audio-waiting'
import type { FairyEmotion, LearningMode, AIStructuredOutput } from '@/types'

/** 单条对话消息（UI 用） */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** ISO 时间，用于日期分割线 */
  createdAt?: string
  /** 精灵消息才有 */
  commands?: AIStructuredOutput
}

/** hook 返回值 */
export interface UseFairyChatReturn {
  messages: ChatMessage[]
  /** 当前精灵情绪 */
  emotion: FairyEmotion
  /** AI 提供的选项按钮 */
  options: string[]
  /** 是否正在流式接收 */
  isStreaming: boolean
  /** 是否正在加载历史消息 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 当前对话 ID（首次发送后由服务端创建） */
  conversationId: string | null
  /** 最近完成/保存的创作 ID */
  latestCreationId: string | null
  /** 消息 ID → AI 生成的图片 URL */
  imageMap: Record<string, string>
  /** 消息 ID → 图片生成中 */
  imageLoadingMap: Record<string, boolean>
  /** 消息 ID → 图片生成失败原因 */
  imageErrorMap: Record<string, string>
  /** 发送一条消息 */
  send: (text: string) => Promise<void>
  /** 重试上一条 */
  retry: () => Promise<void>
  /** 清除错误 */
  clearError: () => void
}

function looksLikeDrawRequest(text: string): boolean {
  return /画|绘图|画画|插图|出图|生成.{0,4}图|图片|来.{0,2}图|图$/u.test(text)
}

function buildImagePromptFromUserMessage(text: string): string {
  return text
    .replace(/^(请|帮我|给我|能不能|可以|来)/u, '')
    .replace(/(吧|呀|呢|吗|。！？!?)+$/u, '')
    .trim()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 流式结束后 assistant 消息入库有延迟，短轮询拿到真实 UUID */
async function fetchLatestAssistantMessageId(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  maxAttempts = 6,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.id) return data.id
    if (attempt < maxAttempts - 1) await sleep(350)
  }
  return null
}

function remapMessageId(
  oldId: string,
  newId: string,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setImageMap: Dispatch<SetStateAction<Record<string, string>>>,
  setImageLoadingMap: Dispatch<SetStateAction<Record<string, boolean>>>,
  setImageErrorMap: Dispatch<SetStateAction<Record<string, string>>>,
) {
  if (oldId === newId) return
  setMessages(prev => prev.map(m => (m.id === oldId ? { ...m, id: newId } : m)))
  setImageMap(prev => {
    if (!prev[oldId]) return prev
    const { [oldId]: url, ...rest } = prev
    return { ...rest, [newId]: url }
  })
  setImageLoadingMap(prev => {
    if (!prev[oldId]) return prev
    const { [oldId]: loading, ...rest } = prev
    return loading ? { ...rest, [newId]: true } : rest
  })
  setImageErrorMap(prev => {
    if (!prev[oldId]) return prev
    const { [oldId]: err, ...rest } = prev
    return { ...rest, [newId]: err }
  })
}

let msgCounter = 0
function genId() {
  return `msg-${Date.now()}-${++msgCounter}`
}

/**
 * 流式过程中实时提取 text 字段
 * AI 返回格式：{"text":"...", "commands":{...}}
 * 流式未完成时 JSON 不完整，用正则尽力提取 "text" 值
 */
function extractStreamingText(raw: string): string {
  const trimmed = raw.trim()

  // 如果不像 JSON，直接返回原文（AI 有时直接回文字）
  if (!trimmed.startsWith('{')) {
    return raw
  }

  // 方法1：如果 JSON 已完整，直接解析
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed.text) return parsed.text
  } catch {
    // JSON 还没完整，用正则提取
  }

  // 方法2：用正则提取 "text" 字段值（处理不完整 JSON）
  // 找到 "text":"  之后的内容
  const startMatch = trimmed.match(/"text"\s*:\s*"/)
  if (!startMatch || startMatch.index === undefined) {
    return '...'
  }

  const textStart = startMatch.index + startMatch[0].length
  let result = ''
  let i = textStart
  while (i < trimmed.length) {
    const ch = trimmed[i]
    if (ch === '\\' && i + 1 < trimmed.length) {
      // 处理转义字符
      const next = trimmed[i + 1]
      if (next === 'n') { result += '\n'; i += 2; continue }
      if (next === '"') { result += '"'; i += 2; continue }
      if (next === '\\') { result += '\\'; i += 2; continue }
      if (next === '/') { result += '/'; i += 2; continue }
      result += next; i += 2; continue
    }
    if (ch === '"') {
      // 遇到未转义的引号 = text 字段结束
      break
    }
    result += ch
    i++
  }

  return result || '...'
}

/**
 * 花园精灵对话 hook
 * 管理消息列表、流式响应、精灵情绪和选项
 */
export function useFairyChat(
  mode: LearningMode,
  subject?: string,
  initialConversationId?: string,
): UseFairyChatReturn {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [emotion, setEmotion] = useState<FairyEmotion>('happy')
  const [options, setOptions] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null,
  )
  const [latestCreationId, setLatestCreationId] = useState<string | null>(null)
  // 记住最后一条用户消息，方便重试
  const lastUserMessageRef = useRef<string>('')
  // 限流自动重试计数器（每次 send 成功后归零）
  const autoRetryCountRef = useRef<number>(0)
  // send 函数 ref（避免 useCallback 内部自引用 lint 警告）
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {})
  // 中断控制器
  const abortRef = useRef<AbortController | null>(null)

  // 图片生成：记录每条消息的关联图片 URL
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [imageLoadingMap, setImageLoadingMap] = useState<Record<string, boolean>>({})
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, string>>({})

  // 加载历史消息：找到该模式最近的会话并恢复消息
  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      // 重置状态再加载（在 async 函数内调用避免同步 setState in effect body）
      setMessages([])
      setConversationId(initialConversationId || null)
      setLatestCreationId(null)
      setOptions([])
      setError(null)
      setEmotion('happy')
      setImageMap({})
      setImageLoadingMap({})
      setImageErrorMap({})
      autoRetryCountRef.current = 0
      setIsLoading(true)
      try {
        const user = await getClientUser()
        if (!user || cancelled) { setIsLoading(false); return }

        // 如果有指定 conversationId，直接加载
        let targetConvId = initialConversationId || null

        if (!targetConvId) {
          // 查找该模式最近的一条会话（不限日期，数据仍在 DB 中）
          // 创造模式下按 mode + subject 过滤，避免不同学科共用会话
          let convQuery = supabase
            .from('conversations')
            .select('id, started_at')
            .eq('child_id', user.id)
            .eq('mode', mode)
            .order('started_at', { ascending: false })
            .limit(1)

          if (mode === 'create' && subject) {
            convQuery = convQuery.eq('subject', subject)
          }

          const { data: recentConvs } = await convQuery

          const recentConv = recentConvs?.[0]
          if (recentConv) {
            targetConvId = recentConv.id
          }
        }

        if (!targetConvId || cancelled) { setIsLoading(false); return }

        // 加载该会话的所有消息
        const { data: dbMessages } = await supabase
          .from('messages')
          .select('id, role, content, structured_output, created_at')
          .eq('conversation_id', targetConvId)
          .order('created_at', { ascending: true })

        if (cancelled) return

        if (dbMessages && dbMessages.length > 0) {
          type DbMessage = {
            id: string
            role: string
            content: string
            structured_output: AIStructuredOutput | null
            created_at: string
          }
          // 去重：连续相同用户消息（没有 AI 回复间隔）只保留最后一条
          const deduped = (dbMessages as DbMessage[])
            .filter(m => m.role !== 'system' && m.content?.trim())
            .filter((m, i, arr) => {
              if (m.role !== 'user') return true
              // 如果下一条也是相同内容的用户消息，跳过当前这条
              const next = arr[i + 1]
              if (next && next.role === 'user' && next.content === m.content) return false
              return true
            })

          const restored: ChatMessage[] = deduped
            .map(m => {
              // 兼容旧数据：如果 content 存的是原始 JSON，重新解析
              let content = m.content
              let commands = m.structured_output || undefined
              if (m.role === 'assistant' && content.trimStart().startsWith('{')) {
                const parsed = parseAIResponse(content)
                content = parsed.text
                if (!commands) commands = parsed.commands
              }
              return {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content,
                commands,
                createdAt: m.created_at,
              }
            })
          setMessages(restored)
          setConversationId(targetConvId)

          // 恢复图片 imageMap（从 structured_output.image_url 恢复）
          const restoredImages: Record<string, string> = {}
          for (const m of restored) {
            if (m.commands?.image_url) {
              restoredImages[m.id] = m.commands.image_url
            }
          }
          if (Object.keys(restoredImages).length > 0) {
            setImageMap(restoredImages)
          }

          // 恢复最后一条 AI 消息的情绪和选项
          const lastAi = [...restored].reverse().find(m => m.role === 'assistant')
          if (lastAi?.commands) {
            setEmotion(lastAi.commands.emotion || 'happy')
            setOptions(lastAi.commands.options || [])
            setLatestCreationId(lastAi.commands.creation_id || null)
          }
        }
      } catch (err) {
        console.error('Load chat history error:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadHistory()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, subject, initialConversationId])

  /**
   * 自动调用图片生成 API，将结果关联到对应消息
   * 在 AI 返回 illustration_prompt 或孩子明确要求画画时调用
   */
  const generateIllustration = useCallback(
    async (prompt: string, convId: string | null, msgId: string) => {
      console.log('[Image] generateIllustration triggered:', { prompt: prompt.slice(0, 50), convId, msgId })
      setImageLoadingMap(prev => ({ ...prev, [msgId]: true }))
      setImageErrorMap(prev => {
        if (!prev[msgId]) return prev
        const next = { ...prev }
        delete next[msgId]
        return next
      })

      try {
        const imageProvider = typeof window !== 'undefined'
          ? localStorage.getItem('imageProvider') || undefined
          : undefined
        const res = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            size: '1K',
            aspect_ratio: '1:1',
            conversation_id: convId,
            provider: imageProvider,
          }),
        })

        const data = await res.json().catch(() => null)
        let resolvedMsgId = msgId
        if (res.ok && data?.url) {
          resolvedMsgId = (data.message_id as string | null) || msgId
          if (resolvedMsgId !== msgId) {
            remapMessageId(msgId, resolvedMsgId, setMessages, setImageMap, setImageLoadingMap, setImageErrorMap)
          }
          setImageMap(prev => ({ ...prev, [resolvedMsgId]: data.url }))
          setMessages(prev =>
            prev.map(m =>
              m.id === resolvedMsgId
                ? {
                    ...m,
                    commands: m.commands
                      ? { ...m.commands, image_url: data.url }
                      : { emotion: 'happy' as FairyEmotion, image_url: data.url },
                  }
                : m,
            ),
          )
          return
        }

        setImageErrorMap(prev => ({
          ...prev,
          [msgId]: data?.error || '插图暂时画不出来，请稍后再试',
        }))
      } catch {
        setImageErrorMap(prev => ({
          ...prev,
          [msgId]: '插图服务连不上，请稍后再试',
        }))
      } finally {
        setImageLoadingMap(prev => {
          const next = { ...prev }
          delete next[msgId]
          return next
        })
      }
    },
    [],
  )

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      lastUserMessageRef.current = trimmed
      setError(null)
      setOptions([])    // 清空旧选项
      setEmotion('thinking')

      // 1. 立即显示用户气泡
      const now = new Date().toISOString()
      const userMsg: ChatMessage = { id: genId(), role: 'user', content: trimmed, createdAt: now }
      setMessages(prev => [...prev, userMsg])

      // 2. 占位精灵气泡（流式填充）
      const aiMsgId = genId()
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', createdAt: now }])

      setIsStreaming(true)
      startWaitingSound() // 精灵思考时播放轻快等待音效

      try {
        // 3. 发送请求（60s 超时，避免 GLM 限流/空流时永久卡在「精灵在想…」）
        const controller = new AbortController()
        abortRef.current = controller
        const timeoutId = setTimeout(() => controller.abort(), 60_000)

        let res: Response
        try {
          res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: trimmed,
              mode,
              subject: subject || undefined,
              conversation_id: conversationId,
            }),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }

        // 读取 conversation_id header
        const newConvId = res.headers.get('X-Conversation-Id')
        if (newConvId) setConversationId(newConvId)

        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          throw new Error(errBody?.error || `请求失败 (${res.status})`)
        }

        const contentType = res.headers.get('Content-Type') || ''
        if (contentType.includes('application/json')) {
          const errBody = await res.json().catch(() => null)
          throw new Error(errBody?.error || '精灵暂时没有回应，请稍后再试')
        }

        // 4. 流式读取
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        if (!reader) throw new Error('无法读取响应')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk

          // 实时更新精灵气泡 — 尝试提取 text 字段，否则显示原文
          const displayText = extractStreamingText(fullText)
          setMessages(prev =>
            prev.map(m => (m.id === aiMsgId ? { ...m, content: displayText } : m)),
          )
        }

        if (!fullText.trim()) {
          throw new Error('精灵暂时没有回应，请稍后再试')
        }

        // 5. 流结束 — 解析结构化输出
        const { text: parsedText, commands } = parseAIResponse(fullText)

        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsgId ? { ...m, content: parsedText, commands } : m,
          ),
        )

        // 更新精灵情绪和选项
        setEmotion(commands.emotion || 'happy')
        setOptions(commands.options || [])

        // 如果 AI 返回了 illustration_prompt，或孩子明确要求画画，自动触发图片生成
        const drawPrompt =
          commands.illustration_prompt ||
          (looksLikeDrawRequest(trimmed) ? buildImagePromptFromUserMessage(trimmed) : null)
        console.log('[Image] drawPrompt check:', { illustration_prompt: commands.illustration_prompt, userLooksLikeDraw: looksLikeDrawRequest(trimmed), drawPrompt })
        if (drawPrompt) {
          const activeConvId = newConvId || conversationId
          let imageMsgId = aiMsgId
          if (activeConvId) {
            const dbMsgId = await fetchLatestAssistantMessageId(supabase, activeConvId)
            if (dbMsgId) {
              remapMessageId(aiMsgId, dbMsgId, setMessages, setImageMap, setImageLoadingMap, setImageErrorMap)
              imageMsgId = dbMsgId
            }
          }
          void generateIllustration(drawPrompt, activeConvId, imageMsgId)
        }

        let creationId = commands.creation_id || null
        if (!creationId && mode === 'create' && commands.creation_complete) {
          const activeConversationId = newConvId || conversationId
          if (activeConversationId) {
            const { data: creation } = await supabase
              .from('creations')
              .select('id')
              .eq('conversation_id', activeConversationId)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single()
            creationId = creation?.id || null
          }
        }
        if (creationId) setLatestCreationId(creationId)
        // 发送成功，重置自动重试计数器
        autoRetryCountRef.current = 0
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('精灵想得太久了，请再试一次')
          setEmotion('surprised')
          setMessages(prev => prev.filter(m => m.id !== aiMsgId))
          return
        }

        const msg = err instanceof Error ? err.message : '网络出了点问题'

        // 限流错误自动重试一次（等待 3 秒后重发）
        const isRateLimit = msg.includes('休息一下') || msg.includes('稍后再试')
        if (isRateLimit && autoRetryCountRef.current < 1) {
          autoRetryCountRef.current++
          setMessages(prev => prev.filter(m => m.id !== aiMsgId))
          setEmotion('thinking')
          setIsStreaming(false)
          abortRef.current = null
          stopWaitingSound()
          // 延迟 3 秒后通过 ref 调用自动重试，避免 send 自引用
          await new Promise(r => setTimeout(r, 3000))
          await sendRef.current(lastUserMessageRef.current)
          return
        }
        autoRetryCountRef.current = 0

        setError(msg)
        setEmotion('surprised')

        // 移除空的占位气泡
        setMessages(prev => prev.filter(m => m.id !== aiMsgId))
      } finally {
        stopWaitingSound() // 停止等待音效
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, subject, conversationId, isStreaming],
  )

  // 保持 sendRef 与最新 send 同步，供自动重试使用
  useEffect(() => { sendRef.current = send }, [send])

  const retry = useCallback(async () => {
    if (!lastUserMessageRef.current) return
    // 移除最后一条用户消息（将被 send 重新添加）
    setMessages(prev => {
      const idx = prev.findLastIndex(m => m.role === 'user')
      return idx >= 0 ? prev.slice(0, idx) : prev
    })
    await send(lastUserMessageRef.current)
  }, [send])

  const clearError = useCallback(() => setError(null), [])

  return {
    messages,
    emotion,
    options,
    isStreaming,
    isLoading,
    error,
    conversationId,
    latestCreationId,
    imageMap,
    imageLoadingMap,
    imageErrorMap,
    send,
    retry,
    clearError,
  }
}
