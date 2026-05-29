/**
 * 报告生成 API
 *
 * POST /api/reports/generate
 * Body: { child_id, type: 'weekly' | 'monthly', period_start?, period_end? }
 * → 聚合数据 + AI 生成摘要 + 保存报告
 */

import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getGlmOpenAiBaseUrl } from '@/lib/ai/glm-config'
import {
  buildReportContent,
  buildReportPrompt,
  buildSuggestionsPrompt,
  type ConversationSummary,
  type MasteryChange,
  type CreationSummary,
} from '@/lib/engine/report-generator'
import { validateBody, generateReportSchema } from '@/lib/api/validation'
import { rateLimitForUser, rateLimitResponse } from '@/lib/api/rate-limit'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const rateLimit = rateLimitForUser(user.id, 'reports/generate', 5, 'RATE_LIMIT_REPORTS_PER_MIN')
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, '报告生成太频繁啦，稍后再试')
  }

  const validation = await validateBody(req, generateReportSchema)
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 })
  }
  const body = validation.data

  const childId = body.child_id || user.id
  const reportType = body.type || 'weekly'

  // 计算时间范围
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (body.period_start && body.period_end) {
    periodStart = new Date(body.period_start)
    periodEnd = new Date(body.period_end)
  } else if (reportType === 'monthly') {
    periodEnd = now
    periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - 30)
  } else {
    // 默认本周
    periodEnd = now
    periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - 7)
  }

  try {
    // 1. 聚合对话数据
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, mode, subject, message_count, metadata, started_at, ended_at')
      .eq('child_id', childId)
      .gte('started_at', periodStart.toISOString())
      .lte('started_at', periodEnd.toISOString())

    const conversationSummaries: ConversationSummary[] = (conversations || []).map(c => {
      const meta = c.metadata as Record<string, unknown> | null
      const startTime = new Date(c.started_at).getTime()
      const endTime = c.ended_at ? new Date(c.ended_at).getTime() : startTime + 600000
      return {
        id: c.id,
        mode: c.mode,
        subject: c.subject || undefined,
        message_count: c.message_count || 0,
        duration_minutes: Math.round((endTime - startTime) / 60000),
        knowledge_tags: Array.isArray(meta?.knowledge_tags) ? meta.knowledge_tags as string[] : [],
        started_at: c.started_at,
      }
    })

    // 2. 聚合掌握度变化（简化：取当前值作为 after，before 设为 0）
    const { data: masteryData } = await supabase
      .from('knowledge_mastery')
      .select('knowledge_point, subject, mastery_level, updated_at')
      .eq('child_id', childId)

    const masteryChanges: MasteryChange[] = (masteryData || []).map(m => ({
      knowledge_point: m.knowledge_point,
      subject: m.subject,
      mastery_before: Math.max(0, m.mastery_level - 10), // 简化估算
      mastery_after: m.mastery_level,
    }))

    // 3. 聚合创作数据
    const { data: creations } = await supabase
      .from('creations')
      .select('id, creation_type, title, subject')
      .eq('child_id', childId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    const creationSummaries: CreationSummary[] = (creations || []).map(c => ({
      id: c.id,
      creation_type: c.creation_type,
      title: c.title,
      subject: c.subject,
    }))

    // 4. 花园统计
    const { count: totalPlants } = await supabase
      .from('garden_plants')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)

    const { count: newPlants } = await supabase
      .from('garden_plants')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)
      .gte('created_at', periodStart.toISOString())

    const { count: bloomingPlants } = await supabase
      .from('garden_plants')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('plant_type', 'blooming')

    // 5. 好奇心种子
    const { data: seeds } = await supabase
      .from('curiosity_seeds')
      .select('question, topic')
      .eq('child_id', childId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    // 6. 构建报告
    const content = buildReportContent(
      conversationSummaries,
      masteryChanges,
      creationSummaries,
      {
        new_plants: newPlants || 0,
        blooming: bloomingPlants || 0,
        total_plants: totalPlants || 0,
      },
      (seeds || []).map(s => ({ question: s.question, topic: s.topic }))
    )

    // 7. AI 生成摘要和建议
    const { data: childProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', childId)
      .single()

    const childName = childProfile?.display_name || '小朋友'

    let aiSummary = ''
    let aiSuggestions: string[] = []

    // 使用智谱 GLM 生成报告
    const glm = createOpenAI({
      baseURL: getGlmOpenAiBaseUrl(),
      apiKey: process.env.GLM_API_KEY || '',
      name: 'glm',
    })

    try {
      const summaryResult = await generateText({
        model: glm.chat('glm-4.7-flash'),
        prompt: buildReportPrompt(content, childName),
      })
      aiSummary = summaryResult.text

      const suggestionsResult = await generateText({
        model: glm.chat('glm-4.7-flash'),
        prompt: buildSuggestionsPrompt(content, childName),
      })

      // 尝试解析 JSON 数组
      try {
        const parsed = JSON.parse(suggestionsResult.text)
        aiSuggestions = Array.isArray(parsed) ? parsed : [suggestionsResult.text]
      } catch {
        // AI 返回非 JSON 时，按行拆分
        aiSuggestions = suggestionsResult.text
          .split('\n')
          .map(s => s.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 3)
      }
    } catch (aiError) {
      console.error('AI report generation error:', aiError)
      aiSummary = `${childName}本${reportType === 'weekly' ? '周' : '月'}共进行了 ${content.overview.total_conversations} 次对话，学习时间 ${content.overview.total_duration_minutes} 分钟。`
      aiSuggestions = ['继续保持学习节奏', '多尝试不同的学习模式', '花园里的植物等你照料']
    }

    // 8. 保存到数据库
    const { data: report, error: saveError } = await supabase
      .from('learning_reports')
      .insert({
        child_id: childId,
        report_type: reportType,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        content,
        ai_summary: aiSummary,
        ai_suggestions: aiSuggestions,
      })
      .select('*')
      .single()

    if (saveError) throw saveError

    return Response.json(report)
  } catch (err) {
    console.error('Report generation error:', err)
    return Response.json({ error: '报告生成失败' }, { status: 500 })
  }
}
