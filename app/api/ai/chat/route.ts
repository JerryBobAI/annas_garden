import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { getGlmOpenAiBaseUrl } from '@/lib/ai/glm-config'
import { getSystemPrompt } from '@/lib/ai/prompts'
import { parseAIResponse } from '@/lib/ai/structured-output'
import { estimateTokens, truncateHistory } from '@/lib/ai/token-manager'
import { inferCreationType, getDefaultCoverEmoji } from '@/lib/ai/prompts-create'
import { isEmptyCreationContent, mergeCreationContent } from '@/lib/ai/creation-save'
import { applyGardenEvent, type GardenSupabaseClient } from '@/lib/garden/events'
import { computeProfileUpdate, type ConversationData } from '@/lib/engine/cognitive-updater'
import { calculateDifficultyAdjustment, inferDifficultyFromMastery } from '@/lib/engine/adaptive-difficulty'
import { getReviewSchedule, getReviewPromptInjection } from '@/lib/engine/spaced-repetition'
import { ChatRequest, Message, Subject, KnowledgeMastery } from '@/types'

function extractAiErrorInfo(err: unknown): { message: string; statusCode?: number } {
  const parts: string[] = []
  let statusCode: number | undefined

  const visit = (value: unknown, depth = 0) => {
    if (depth > 5 || value == null) return

    if (typeof value === 'string') {
      parts.push(value)
      return
    }

    if (value instanceof Error) {
      parts.push(value.message)
      // AI SDK 的 AI_APICallError 继承 Error 但带有 statusCode/responseBody 等属性
      const errObj = value as Error & { statusCode?: number; responseBody?: string; cause?: unknown; data?: unknown }
      if (typeof errObj.statusCode === 'number') statusCode = errObj.statusCode
      if (typeof errObj.responseBody === 'string') parts.push(errObj.responseBody)
      if (errObj.data) visit(errObj.data, depth + 1)
      visit(errObj.cause, depth + 1)
      return
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (typeof obj.statusCode === 'number') statusCode = obj.statusCode
      if (typeof obj.message === 'string') parts.push(obj.message)
      if (typeof obj.responseBody === 'string') parts.push(obj.responseBody)
      if (obj.lastError) visit(obj.lastError, depth + 1)
      if (Array.isArray(obj.errors)) obj.errors.forEach(item => visit(item, depth + 1))
      if (obj.data) visit(obj.data, depth + 1)
      if (obj.error) visit(obj.error, depth + 1)
    }
  }

  visit(err)
  return { message: parts.join(' '), statusCode }
}

function mapAiProviderError(err: unknown): Response {
  const { message, statusCode } = extractAiErrorInfo(err)

  if (
    statusCode === 429 ||
    message.includes('rate_limit') ||
    message.includes('429') ||
    message.includes('速率限制') ||
    message.includes('访问量过大') ||
    message.includes('"code":"1302"') ||
    message.includes('"code":"1305"') ||
    message.includes('1302') ||
    message.includes('1305')
  ) {
    return Response.json(
      { error: '精灵需要休息一下，稍后再试' },
      { status: 429 },
    )
  }
  if (statusCode === 401 || message.includes('api_key') || message.includes('401')) {
    return Response.json({ error: '花园和外面断开了' }, { status: 500 })
  }
  if (statusCode === 500 || message.includes('网络错误')) {
    return Response.json(
      { error: '精灵和外面连得不太稳，请稍后再试' },
      { status: 502 },
    )
  }

  return Response.json(
    { error: '精灵遇到了一点小问题，请再试一次' },
    { status: 502 },
  )
}


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

  if (!process.env.GLM_API_KEY) {
    return Response.json(
      { error: '请先在 .env.local 中配置 GLM_API_KEY' },
      { status: 500 },
    )
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

    // 4. 构建 prompt（含复习注入）
    let systemPrompt = getSystemPrompt(mode, subject)

    // 艾宾浩斯复习注入：新对话开始时，查询需要复习的知识点
    if (!conversation_id && (mode === 'quest' || mode === 'explore')) {
      try {
        const { data: masteryData } = await supabase
          .from('knowledge_mastery')
          .select('*')
          .eq('child_id', user.id)

        if (masteryData && masteryData.length > 0) {
          const schedule = getReviewSchedule(
            masteryData as KnowledgeMastery[],
            subject as Subject | undefined
          )
          const injection = getReviewPromptInjection(schedule)
          if (injection) {
            systemPrompt += '\n\n' + injection
          }
        }
      } catch {
        // 复习注入失败不影响对话
      }
    }

    const systemPromptTokens = estimateTokens(systemPrompt)

    // 截断历史消息以适应上下文窗口
    const truncatedHistory = truncateHistory(historyMessages, systemPromptTokens)

    // 组装 AI SDK messages 格式（过滤空内容消息，避免 GLM 报参数错误）
    // 注意：assistant 历史消息只发纯文本，不发 JSON 包装，兼容 glm-4.7 等推理模型
    const aiMessages = [
      ...truncatedHistory
        .filter(m => m.content?.trim())
        .map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      { role: 'user' as const, content: message },
    ]

    // 5. 保存用户消息（避免重复：检查最后一条用户消息是否相同）
    const userTokens = estimateTokens(message)
    const { data: lastUserMsg } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 只有当最后一条用户消息不同时才插入（防止重试导致重复）
    if (!lastUserMsg || lastUserMsg.content !== message) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        token_count: userTokens,
      })
    }

    // 6. 调用 OpenAI 流式生成
    // 使用智谱 GLM（OpenAI 兼容 Chat Completions API）
    const glmModel = process.env.GLM_MODEL || 'glm-4.7-flash'
    console.log('[Chat] Using GLM model:', glmModel)
    const glm = createOpenAI({
      baseURL: getGlmOpenAiBaseUrl(),
      apiKey: process.env.GLM_API_KEY || '',
      name: 'glm',
    })

    const result = streamText({
      model: glm.chat(glmModel),
      system: systemPrompt,
      messages: aiMessages,
      maxRetries: 0,
      timeout: 90_000,
      onError({ error }) {
        console.error('[Chat] GLM stream error:', error)
      },
      onFinish: async ({ text }) => {
        // 流结束后保存 AI 回复；空文本说明是错误流，不入库
        if (!text?.trim()) return

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

        // ── Phase 4: 认知档案自动更新 ──
        try {
          // 获取对话开始时间计算时长
          const { data: convData } = await supabase
            .from('conversations')
            .select('started_at')
            .eq('id', conversationId)
            .single()

          const duration = convData?.started_at
            ? Math.round((Date.now() - new Date(convData.started_at).getTime()) / 1000)
            : 300 // 默认 5 分钟

          const conversationDataForProfile: ConversationData = {
            mode,
            duration,
            messageCount: 2,
            knowledgeTags: newTags,
            subject: subject as Subject | undefined,
          }

          // 获取认知档案
          const { data: profile } = await supabase
            .from('cognitive_profiles')
            .select('attention_span_avg, total_conversations, total_messages')
            .eq('child_id', user.id)
            .single()

          if (profile) {
            // 获取最近 10 次对话模式
            const { data: recentConvs } = await supabase
              .from('conversations')
              .select('mode')
              .eq('child_id', user.id)
              .order('started_at', { ascending: false })
              .limit(10)

            const recentModes = (recentConvs || []).map(c => c.mode)

            // 获取最近 20 次对话的知识点标签
            const { data: recentConvMeta } = await supabase
              .from('conversations')
              .select('metadata')
              .eq('child_id', user.id)
              .order('started_at', { ascending: false })
              .limit(20)

            const recentTags = (recentConvMeta || []).flatMap(c => {
              const meta = c.metadata as Record<string, unknown> | null
              return Array.isArray(meta?.knowledge_tags) ? meta.knowledge_tags as string[] : []
            })

            // 计算更新
            const update = computeProfileUpdate(
              profile,
              conversationDataForProfile,
              recentModes,
              recentTags
            )

            await supabase
              .from('cognitive_profiles')
              .update({
                preferred_mode: update.preferred_mode,
                attention_span_avg: update.attention_span_avg,
                interests: update.interests,
                total_conversations: update.total_conversations,
                total_messages: update.total_messages,
                updated_at: new Date().toISOString(),
              })
              .eq('child_id', user.id)
          }
        } catch (profileError) {
          console.error('Failed to update cognitive profile:', profileError)
        }

        // ── Phase 4: 自适应难度（任务模式） ──
        if (mode === 'quest' && subject && newTags.length > 0) {
          try {
            const primaryTag = newTags[0]

            // 获取当前掌握度
            const { data: mastery } = await supabase
              .from('knowledge_mastery')
              .select('mastery_level')
              .eq('child_id', user.id)
              .eq('subject', subject)
              .eq('knowledge_point', primaryTag)
              .single()

            const currentDifficulty = commands.difficulty || inferDifficultyFromMastery(mastery?.mastery_level || 0)

            // 获取最近的答题结果（从最近 5 次 quest 对话的 difficulty 推断）
            const { data: recentQuests } = await supabase
              .from('messages')
              .select('structured_output')
              .eq('conversation_id', conversationId!)
              .eq('role', 'assistant')
              .order('created_at', { ascending: true })

            // 从 AI 的 difficulty 字段推断答题结果
            // difficulty 存在且 > 0 表示有答题评估
            const recentResults = (recentQuests || [])
              .map(m => {
                const so = m.structured_output as Record<string, unknown> | null
                return so?.difficulty ? (so.difficulty as number) >= currentDifficulty : null
              })
              .filter((r): r is boolean => r !== null)

            if (recentResults.length >= 2) {
              const adjustment = calculateDifficultyAdjustment(currentDifficulty, recentResults)
              if (adjustment) {
                // 记录难度变化
                await supabase.from('difficulty_history').insert({
                  child_id: user.id,
                  subject,
                  knowledge_point: primaryTag,
                  old_difficulty: currentDifficulty,
                  new_difficulty: adjustment.newDifficulty,
                  reason: adjustment.reason,
                  conversation_id: conversationId,
                })

                // 更新掌握度（答对升+5，答错降-3）
                if (mastery) {
                  const delta = adjustment.newDifficulty > currentDifficulty ? 5 : -3
                  const newLevel = Math.max(0, Math.min(100, (mastery.mastery_level || 0) + delta))
                  await supabase
                    .from('knowledge_mastery')
                    .update({ mastery_level: newLevel, updated_at: new Date().toISOString() })
                    .eq('child_id', user.id)
                    .eq('subject', subject)
                    .eq('knowledge_point', primaryTag)
                }
              }
            }
          } catch (difficultyError) {
            console.error('Failed to adjust difficulty:', difficultyError)
          }
        }
      },
    })

    // 7. 返回流式响应
    // 先等待完整文本（非流式）；若为空说明 GLM 限流/出错，返回明确错误码
    // 注意：这会牺牲"逐字显示"体验，但确保限流时能返回正确的错误而非空 200
    let fullText: string
    try {
      fullText = await result.text
    } catch (err) {
      console.error('[Chat] streamText.text rejected:', err)
      return mapAiProviderError(err)
    }

    if (!fullText?.trim()) {
      console.warn('[Chat] Empty response from GLM, likely rate limited')
      return Response.json(
        { error: '精灵需要休息一下，稍后再试' },
        { status: 429 },
      )
    }

    // 正常返回纯文本（前端按 stream 方式逐 chunk 读，但这里一次性返回也兼容）
    return new Response(fullText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversationId!,
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return mapAiProviderError(err)
  }
}
