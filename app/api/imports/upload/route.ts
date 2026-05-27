/**
 * PDF 文件上传 + AI 知识点提取
 *
 * POST /api/imports/upload
 * Content-Type: multipart/form-data
 * Body: file (PDF)
 * → 解析 PDF → 提取文本 → AI 分析知识点
 */

import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getGlmOpenAiBaseUrl } from '@/lib/ai/glm-config'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  // 解析 multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: '请上传文件' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return Response.json({ error: '请选择 PDF 文件' }, { status: 400 })
  }

  // 验证文件类型
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return Response.json({ error: '仅支持 PDF 文件' }, { status: 400 })
  }

  // 限制文件大小（5MB）
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return Response.json({ error: '文件不能超过 5MB' }, { status: 400 })
  }

  try {
    // 1. 读取 PDF 文件为 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. 使用 pdf-parse 提取文本
    const { PDFParse } = await import('pdf-parse')
    const pdf = new PDFParse({ data: new Uint8Array(buffer) })
    const textResult = await pdf.getText()
    // textResult.text 是全文拼接；pages 是逐页数组
    const extractedText = textResult.text?.trim() || ''
    const pageCount = textResult.pages?.length || 0

    if (!extractedText) {
      await pdf.destroy()
      return Response.json({ error: 'PDF 中未找到文本内容' }, { status: 400 })
    }

    // 截取前 3000 字（避免 token 超限）
    const textForAI = extractedText.slice(0, 3000)
    await pdf.destroy()

    // 3. 创建导入记录
    const { data: importRecord, error: insertError } = await supabase
      .from('content_imports')
      .insert({
        parent_id: user.id,
        import_type: 'pdf',
        original_content: extractedText.slice(0, 10000),  // 保存前 10000 字
        status: 'processing',
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // 4. AI 提取知识点
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
        prompt: `你是一位小学教育专家。分析以下从 PDF 课本中提取的学习内容，提取适合一年级孩子的知识点。

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

PDF 内容：
${textForAI}`,
      })

      try {
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
        console.error('Failed to parse AI extraction result from PDF')
      }
    } catch (aiError) {
      console.error('AI extraction error (PDF):', aiError)
    }

    // 5. 更新导入记录
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

    return Response.json({
      ...updated,
      pdf_info: {
        pages: pageCount,
        text_length: extractedText.length,
        filename: file.name,
      },
    })
  } catch (err) {
    console.error('PDF import error:', err)
    return Response.json({ error: 'PDF 解析失败，请检查文件是否损坏' }, { status: 500 })
  }
}
