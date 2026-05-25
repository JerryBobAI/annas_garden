import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GLM_BASE_URL = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas').replace(/\/v4\/chat\/completions\/?$/, '')
const GLM_API_KEY = process.env.GLM_API_KEY

interface GeneratedExercise {
  question: string
  options: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  knowledge_points: string[]
}

const SYSTEM_PROMPT = `你是一位专业的一年级小学教师，擅长根据学习内容设计练习题。
根据用户提供的内容，生成适合一年级学生的选择题练习。

要求：
1. 每道题必须有 2-4 个选项
2. 必须标注正确答案（A/B/C/D）
3. 难度分为 easy/medium/hard
4. 标注知识点
5. 题目语言简单，适合 6-7 岁儿童
6. 数学题用数字和简单算式，语文题用常用汉字，英语题用基础单词

返回严格的 JSON 格式，不要有其他文字：
{
  "title": "练习标题",
  "exercises": [
    {
      "question": "题目文字",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correct_answer": "A",
      "difficulty": "easy",
      "knowledge_points": ["知识点1"]
    }
  ]
}`

export async function POST(req: NextRequest) {
  // 认证检查：防止匿名用户调用消耗 AI 额度
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  if (!GLM_API_KEY) {
    return NextResponse.json(
      { error: '请先在 .env.local 中配置 GLM_API_KEY' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { mode, text, image, subject } = body as {
      mode: 'text' | 'image'
      text?: string
      image?: string // base64
      subject?: string
    }

    const subjectHint = subject ? `学科：${subject}。` : ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any[]

    if (mode === 'image' && image) {
      // 图片识别模式 - 使用 GLM-4V
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${subjectHint}请识别这张图片中的学习内容，并生成适合一年级学生的选择题练习。`,
            },
            {
              type: 'image_url',
              image_url: { url: image },
            },
          ],
        },
      ]
    } else if (mode === 'text' && text) {
      // 文本生成模式
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${subjectHint}根据以下内容生成一年级练习题：\n\n${text}`,
        },
      ]
    } else {
      return NextResponse.json(
        { error: '请提供文本内容或上传图片' },
        { status: 400 }
      )
    }

    // 选择模型：图片用 glm-4v-flash，文本用 glm-4-flash
    const model = mode === 'image' ? 'glm-4v-flash' : 'glm-4-flash'

    const response = await fetch(`${GLM_BASE_URL}/v4/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('GLM API error:', response.status, errText)
      return NextResponse.json(
        { error: `AI 服务返回错误 (${response.status})，请检查 API Key 是否正确` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 尝试提取 JSON
    let parsed: { title?: string; exercises: GeneratedExercise[] }
    try {
      // 尝试直接解析
      parsed = JSON.parse(content)
    } catch {
      // 尝试从 markdown 代码块中提取
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim())
      } else {
        return NextResponse.json(
          { error: 'AI 返回格式异常，请重试', raw: content },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({
      title: parsed.title || 'AI 生成的练习',
      exercises: (parsed.exercises || []).map((e: GeneratedExercise, i: number) => {
        // 标准化：去掉选项中的字母前缀（如 "A. 2" → "2"）
        const cleanOptions = (e.options || []).map((opt: string) =>
          opt.replace(/^[A-Da-d][.、．)\s]+/, '').trim()
        )
        // 标准化：correct_answer 映射到实际选项文本
        let correctAnswer = e.correct_answer
        const letterIndex = 'ABCD'.indexOf(correctAnswer.toUpperCase())
        if (letterIndex >= 0 && cleanOptions[letterIndex]) {
          correctAnswer = cleanOptions[letterIndex]
        } else {
          // correct_answer 可能已经是选项文本，直接用
          correctAnswer = e.correct_answer
        }

        return {
          id: `ai-${Date.now()}-${i}`,
          question: e.question,
          options: cleanOptions,
          correct_answer: correctAnswer,
          difficulty: e.difficulty || 'medium',
          knowledge_points: e.knowledge_points || [],
        }
      }),
    })
  } catch (err: unknown) {
    console.error('AI generate error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI 生成失败' },
      { status: 500 }
    )
  }
}
