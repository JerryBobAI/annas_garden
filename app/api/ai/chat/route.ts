import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { getSystemPrompt } from '@/lib/ai/prompts'
import { parseAIResponse } from '@/lib/ai/structured-output'
import { estimateTokens, truncateHistory } from '@/lib/ai/token-manager'
import { inferCreationType, getDefaultCoverEmoji } from '@/lib/ai/prompts-create'
import { isEmptyCreationContent, mergeCreationContent } from '@/lib/ai/creation-save'
import { applyGardenEvent, type GardenSupabaseClient } from '@/lib/garden/events'
import { ChatRequest, Message, Subject } from '@/types'

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

        // 保存 AI 消息；创造模式稍后可能补写 creation_id。
        const { data: aiMessage } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: parsedText,
            structured_output: commands,
            token_count: aiTokens,
          })
          .select('id')
          .single()

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

        // 服务端直接处理花园事件，避免只记录 metadata 但花园不生长。
        if (commands.garden_event) {
          try {
            await applyGardenEvent({
              supabase: supabase as unknown as GardenSupabaseClient,
              childId: user.id,
              event: commands.garden_event,
              conversationId,
              knowledgeTags: newTags,
              subject: subject as Subject | undefined,
            })
          } catch (gardenError) {
            console.error('Failed to apply garden event:', gardenError)
          }
        }

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

        // ── Phase 3: 创造模式自动保存 ──
        if (mode === 'create') {
          const creationPage = commands.creation_page
          const creationTitle = commands.creation_title
          const creationComplete = commands.creation_complete
          const illustrationPrompt = commands.illustration_prompt

          if (creationPage) {
            // 查找该对话关联的进行中创作
            const { data: existingCreation } = await supabase
              .from('creations')
              .select('id, title, content, word_count, knowledge_tags')
              .eq('conversation_id', conversationId)
              .eq('child_id', user.id)
              .eq('status', 'in_progress')
              .single()

            let creationId: string | null = null

            if (existingCreation) {
              creationId = existingCreation.id
            } else {
              // 首次创造 → 创建创作记录
              const creationType = inferCreationType(subject as 'chinese' | 'math' | 'english' | undefined)
              const coverEmoji = getDefaultCoverEmoji(subject as 'chinese' | 'math' | 'english' | undefined)
              const { data: newCreation, error: createErr } = await supabase
                .from('creations')
                .insert({
                  child_id: user.id,
                  creation_type: creationType,
                  title: creationTitle || '未命名创作',
                  subject: subject || 'chinese',
                  cover_emoji: coverEmoji,
                  conversation_id: conversationId,
                  content: {},
                })
                .select('id')
                .single()

              if (createErr || !newCreation) {
                console.error('Failed to create creation:', createErr)
              } else {
                creationId = newCreation.id
              }
            }

            if (creationId) {
              // 获取当前页数
              const { count: pageCount } = await supabase
                .from('creation_pages')
                .select('id', { count: 'exact', head: true })
                .eq('creation_id', creationId)

              const nextPage = (pageCount || 0) + 1

              // 保存新页面
              await supabase.from('creation_pages').insert({
                creation_id: creationId,
                page_number: nextPage,
                author: 'both',
                content: creationPage,
                illustration_prompt: illustrationPrompt || null,
                knowledge_tags: commands.knowledge_tags || [],
              })

              const existingTags = Array.isArray(existingCreation?.knowledge_tags)
                ? existingCreation.knowledge_tags
                : []
              const mergedCreationTags = [...new Set([...existingTags, ...(commands.knowledge_tags || [])])]
              const mergedContent = mergeCreationContent(
                subject as Subject | undefined,
                existingCreation?.content,
                creationPage,
                nextPage,
                commands.knowledge_tags || [],
              )

              // 更新创作标题、内容和完成状态。
              const updateData: Record<string, unknown> = {
                word_count: (existingCreation?.word_count || 0) + creationPage.length,
                content: mergedContent,
                knowledge_tags: mergedCreationTags,
              }
              if (
                creationTitle &&
                (!existingCreation ||
                  existingCreation.title === '未命名创作' ||
                  isEmptyCreationContent(existingCreation.content))
              ) {
                updateData.title = creationTitle
              }

              // 如果创作完成
              if (creationComplete) {
                updateData.status = 'completed'
              }

              await supabase
                .from('creations')
                .update(updateData)
                .eq('id', creationId)

              commands.creation_id = creationId
              if (aiMessage?.id) {
                await supabase
                  .from('messages')
                  .update({ structured_output: commands })
                  .eq('id', aiMessage.id)
              }

              if (creationComplete) {
                try {
                  await applyGardenEvent({
                    supabase: supabase as unknown as GardenSupabaseClient,
                    childId: user.id,
                    event: 'bloom',
                    conversationId,
                    knowledgeTags: mergedCreationTags,
                    subject: subject as Subject | undefined,
                  })
                } catch (gardenError) {
                  console.error('Failed to bloom creation plant:', gardenError)
                }
              }
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
