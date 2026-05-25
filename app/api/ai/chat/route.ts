import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { getSystemPrompt } from '@/lib/ai/prompts'
import { parseAIResponse } from '@/lib/ai/structured-output'
import { estimateTokens, truncateHistory } from '@/lib/ai/token-manager'
import { ChatRequest, Message } from '@/types'

export async function POST(req: Request) {
  // 1. 认证
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  // 2. 解析请求
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { conversation_id, message, mode, subject } = body

  if (!message?.trim()) {
    return Response.json({ error: '请输入内容' }, { status: 400 })
  }

  if (!['explore', 'quest', 'create'].includes(mode)) {
    return Response.json({ error: '无效的学习模式' }, { status: 400 })
  }

  try {
    // 3. 获取或创建对话
    let conversationId = conversation_id
    let historyMessages: Message[] = []

    if (conversationId) {
      // 加载已有对话的历史消息
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError
      historyMessages = (messages || []) as Message[]
    } else {
      // 创建新对话
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          child_id: user.id,
          mode,
          subject: subject || null,
          metadata: { garden_events: [], knowledge_tags: [], difficulty_avg: 0 },
        })
        .select('id')
        .single()

      if (convError) throw convError
      conversationId = conv.id
    }

    // 4. 构建 prompt
    const systemPrompt = getSystemPrompt(mode, subject)
    const systemPromptTokens = estimateTokens(systemPrompt)

    // 截断历史消息以适应上下文窗口
    const truncatedHistory = truncateHistory(historyMessages, systemPromptTokens)

    // 组装 AI SDK messages 格式
    const aiMessages = [
      ...truncatedHistory.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.role === 'assistant' && m.structured_output
          // AI 的历史消息用完整 JSON 格式还原，保持对话连贯性
          ? JSON.stringify({ text: m.content, commands: m.structured_output })
          : m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // 5. 保存用户消息
    const userTokens = estimateTokens(message)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      token_count: userTokens,
    })

    // 6. 调用 OpenAI 流式生成
    // 使用智谱 GLM（OpenAI 兼容 Chat Completions API）
    const glm = createOpenAI({
      baseURL: process.env.GLM_BASE_URL + '/v4',
      apiKey: process.env.GLM_API_KEY || '',
      name: 'glm',
    })

    const result = streamText({
      model: glm.chat('glm-4.7-flash'),
      system: systemPrompt,
      messages: aiMessages,
      onFinish: async ({ text }) => {
        // 流结束后保存 AI 回复
        const { text: parsedText, commands } = parseAIResponse(text)
        const aiTokens = estimateTokens(text)

        // 保存 AI 消息
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: parsedText,
          structured_output: commands,
          token_count: aiTokens,
        })

        // 更新对话消息计数
        const { data: conv } = await supabase
          .from('conversations')
          .select('message_count, metadata')
          .eq('id', conversationId)
          .single()

        const currentCount = conv?.message_count || 0
        const defaultMeta = { garden_events: [], knowledge_tags: [], difficulty_avg: 0 }
        const currentMeta = { ...defaultMeta, ...(conv?.metadata || {}) }

        // 合并 knowledge_tags（防护非数组情况）
        const newTags = commands.knowledge_tags || []
        const existingTags = Array.isArray(currentMeta.knowledge_tags) ? currentMeta.knowledge_tags : []
        const mergedTags = [...new Set([...existingTags, ...newTags])]

        // 更新 garden_events（防护非数组情况）
        const existingEvents = Array.isArray(currentMeta.garden_events) ? currentMeta.garden_events : []
        const newEvents = commands.garden_event
          ? [...existingEvents, commands.garden_event]
          : existingEvents

        // 更新 difficulty_avg
        const newDiffAvg = commands.difficulty
          ? (currentMeta.difficulty_avg * currentCount + commands.difficulty) / (currentCount + 2)
          : currentMeta.difficulty_avg

        await supabase
          .from('conversations')
          .update({
            message_count: currentCount + 2, // +2 = 用户消息 + AI 消息
            metadata: {
              garden_events: newEvents,
              knowledge_tags: mergedTags,
              difficulty_avg: Math.round(newDiffAvg * 100) / 100,
            },
          })
          .eq('id', conversationId)

        // 更新知识掌握度
        if (newTags.length > 0 && subject) {
          for (const tag of newTags) {
            const { data: existing } = await supabase
              .from('knowledge_mastery')
              .select('id, practice_count, source_conversations')
              .eq('child_id', user.id)
              .eq('subject', subject)
              .eq('knowledge_point', tag)
              .single()

            if (existing) {
              await supabase
                .from('knowledge_mastery')
                .update({
                  practice_count: existing.practice_count + 1,
                  last_practiced_at: new Date().toISOString(),
                  source_conversations: [...new Set([...existing.source_conversations, conversationId])],
                })
                .eq('id', existing.id)
            } else {
              await supabase
                .from('knowledge_mastery')
                .insert({
                  child_id: user.id,
                  subject,
                  knowledge_point: tag,
                  practice_count: 1,
                  last_practiced_at: new Date().toISOString(),
                  source_conversations: [conversationId],
                })
            }
          }
        }
      },
    })

    // 7. 返回流式响应，使用自定义 header 传递 conversation_id
    return result.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': conversationId!,
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)

    // 区分不同类型的错误
    const errorMessage = err instanceof Error ? err.message : String(err)

    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return Response.json(
        { error: '精灵需要休息一下，稍后再试' },
        { status: 429 }
      )
    }
    if (errorMessage.includes('api_key') || errorMessage.includes('401')) {
      return Response.json(
        { error: '花园和外面断开了' },
        { status: 500 }
      )
    }

    return Response.json(
      { error: '精灵遇到了一点小问题，请再试一次' },
      { status: 500 }
    )
  }
}
