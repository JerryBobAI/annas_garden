/**
 * 内容导入 API
 *
 * POST /api/imports
 * Body: { type: 'text' | 'pdf' | 'image', content?: string }
 * → 创建导入记录 + AI 提取知识点
 *
 * GET /api/imports
 * → 查询导入历史
 *
 * PATCH /api/imports (body: { id, linked_goals?, status? })
 * → 确认/修改导入结果
 */

import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getGlmOpenAiBaseUrl } from '@/lib/ai/glm-config'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  const { data: imports, error } = await supabase
    .from('content_imports')
    .select('*')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return Response.json({ error: '获取导入记录失败' }, { status: 500 })
  }

  return Response.json({ imports: imports || [], total: imports?.length || 0 })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: { type?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const importType = body.type || 'text'
  const content = body.content

  if (!['text', 'pdf', 'image'].includes(importType)) {
    return Response.json({ error: '无效的导入类型' }, { status: 400 })
  }

  if (importType === 'text' && !content?.trim()) {
    return Response.json({ error: '请输入文本内容' }, { status: 400 })
  }

  try {
    // 1. 创建导入记录（状态: processing）
    const { data: importRecord, error: insertError } = await supabase
      .from('content_imports')
      .insert({
        parent_id: user.id,
        import_type: importType,
        original_content: content || null,
        status: 'processing',
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // 2. AI 提取知识点
    const glm = createOpenAI({
      baseURL: getGlmOpenAiBaseUrl(),
      apiKey: process.env.GLM_API_KEY || '',
      name: 'glm',
    })

    let extractedKnowledge = {
      knowledge_points: [] as string[],
      subject: 'chinese' as string,
      suggested_goals: [] as string[],
    }

    try {
      const result = await generateText({
        model: glm.chat('glm-4.7-flash'),
        prompt: `你是一位小学教育专家。分析以下学习内容，提取适合一年级孩子的知识点。

要求：
1. 判断学科 (chinese/math/english)
2. 提取知识点列表（简短标签）
3. 建议学习目标

返回 JSON 格式：
{
  "subject": "chinese|math|english",
  "knowledge_points": ["知识点1", "知识点2", ...],
  "suggested_goals": ["目标1", "目标2"]
}

学习内容：
${content}`,
      })

      try {
        // 提取 JSON（AI 可能包裹在 markdown 代码块中）
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          extractedKnowledge = {
            knowledge_points: Array.isArray(parsed.knowledge_points) ? parsed.knowledge_points : [],
            subject: ['chinese', 'math', 'english'].includes(parsed.subject) ? parsed.subject : 'chinese',
            suggested_goals: Array.isArray(parsed.suggested_goals) ? parsed.suggested_goals : [],
          }
        }
      } catch {
        console.error('Failed to parse AI extraction result')
      }
    } catch (aiError) {
      console.error('AI extraction error:', aiError)
    }

    // 3. 更新导入记录
    const { data: updated, error: updateError } = await supabase
      .from('content_imports')
      .update({
        extracted_knowledge: extractedKnowledge,
        status: extractedKnowledge.knowledge_points.length > 0 ? 'completed' : 'failed',
      })
      .eq('id', importRecord.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return Response.json(updated)
  } catch (err) {
    console.error('Import API error:', err)
    return Response.json({ error: '导入处理失败' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  let body: { id?: string; linked_goals?: string[]; status?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  if (!body.id) {
    return Response.json({ error: '缺少导入 ID' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.linked_goals) updateData.linked_goals = body.linked_goals
  if (body.status) updateData.status = body.status

  const { data: updated, error } = await supabase
    .from('content_imports')
    .update(updateData)
    .eq('id', body.id)
    .eq('parent_id', user.id)
    .select('*')
    .single()

  if (error) {
    return Response.json({ error: '更新失败' }, { status: 500 })
  }

  return Response.json(updated)
}
