'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { parseAIResponse } from '@/lib/ai/structured-output'
import { createClient, getClientUser } from '@/lib/supabase/client'
import type { FairyEmotion, LearningMode, AIStructuredOutput } from '@/types'

/** 单条对话消息（UI 用） */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
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
  /** 发送一条消息 */
  send: (text: string) => Promise<void>
  /** 重试上一条 */
  retry: () => Promise<void>
  /** 清除错误 */
  clearError: () => void
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
  // 中断控制器
  const abortRef = useRef<AbortController | null>(null)

  // 加载历史消息：找到该模式最近的会话并恢复消息
  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      // 重置状态再加载（在 async 函数内调用避免同步 setState in effect body）
      setMessages([])
      setConversationId(initialConversationId || null)
      setLatestCreationId(null)
      setOptions([])
      setIsLoading(true)
      try {
        const user = await getClientUser()
        if (!user || cancelled) { setIsLoading(false); return }

        // 如果有指定 conversationId，直接加载
        let targetConvId = initialConversationId || null

        if (!targetConvId) {
          // 查找该模式今天最近的会话
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
            // 只恢复今天的会话
            const convDate = new Date(recentConv.started_at).toDateString()
            const today = new Date().toDateString()
            if (convDate === today) {
              targetConvId = recentConv.id
            }
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
          const restored: ChatMessage[] = (dbMessages as DbMessage[])
            .filter(m => m.role !== 'system')
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
              }
            })
          setMessages(restored)
          setConversationId(targetConvId)

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

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      lastUserMessageRef.current = trimmed
      setError(null)
      setOptions([])    // 清空旧选项
      setEmotion('thinking')

      // 1. 立即显示用户气泡
      const userMsg: ChatMessage = { id: genId(), role: 'user', content: trimmed }
      setMessages(prev => [...prev, userMsg])

      // 2. 占位精灵气泡（流式填充）
      const aiMsgId = genId()
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }])

      setIsStreaming(true)

      try {
        // 3. 发送请求
        const controller = new AbortController()
        abortRef.current = controller

        const res = await fetch('/api/ai/chat', {
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

        // 读取 conversation_id header
        const newConvId = res.headers.get('X-Conversation-Id')
        if (newConvId) setConversationId(newConvId)

        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          throw new Error(errBody?.error || `请求失败 (${res.status})`)
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
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return

        const msg = err instanceof Error ? err.message : '网络出了点问题'
        setError(msg)
        setEmotion('surprised')

        // 移除空的占位气泡
        setMessages(prev => prev.filter(m => m.id !== aiMsgId))
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, subject, conversationId, isStreaming],
  )

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
    send,
    retry,
    clearError,
  }
}
