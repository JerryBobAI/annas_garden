/**
 * AI 图片生成 API
 * POST /api/ai/image
 *
 * 支持四种 Provider（按优先级）：
 * 1. SeedDance / Doubao Seedream 5.0（通过 ARK_API_KEY）— 高质量文生图
 * 2. LabNana（通过 LABNANA_API_KEY）— Google Imagen
 * 3. 智谱 CogView（备选，通过 GLM_API_KEY）
 * 4. OpenAI DALL-E（备选，通过 OPENAI_API_KEY）
 *
 * 通过 IMAGE_PROVIDER 环境变量指定首选：seedance / labnana / cogview / dalle
 * 通过 IMAGE_PROVIDER_ORDER 环境变量自定义优先级顺序（逗号分隔）
 *
 * 用途：在对话中为孩子生成教学辅助图片
 * 例如：看图说话、数学情境、英语场景等
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitForUser, rateLimitResponse } from '@/lib/api/rate-limit'
import { persistIllustrationToStorage } from '@/lib/storage/persist-image'
import { attachImageUrlToLatestAssistantMessage } from '@/lib/messages/attach-image-url'

interface ImageRequest {
  prompt: string           // 图片描述（中英文均可）
  size?: '1K' | '2K' | '4K' // LabNana 尺寸
  aspect_ratio?: string    // 宽高比，如 "1:1", "3:2", "16:9"
  conversation_id?: string // 关联对话
  provider?: string        // 指定 Provider（前端 UI 切换时传入）
}

export async function POST(req: Request) {
  // 1. 认证
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const rateLimit = rateLimitForUser(user.id, 'ai/image', 10, 'RATE_LIMIT_IMAGE_PER_MIN')
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, '图片生成太频繁啦，稍后再试')
  }

  // 2. 解析请求
  let body: ImageRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { prompt, size = '1K', aspect_ratio = '1:1', provider: requestProvider, conversation_id } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: '请提供图片描述' }, { status: 400 })
  }

  // 3. 安全过滤 — 给 prompt 加上儿童安全前缀
  const safePrompt = `儿童教育插画风格，可爱、色彩丰富、水彩绘本质感。${prompt}。适合6-12岁儿童，无暴力、无恐怖元素。`

  try {
    // 4. 选择 Provider 生成图片（请求指定 > 环境变量 > 默认顺序）
    const result = await generateImage(safePrompt, size, aspect_ratio, requestProvider)

    // 上传到 Supabase Storage 获得永久 URL；失败则回退临时 URL
    const storedUrl = await persistIllustrationToStorage(
      supabase,
      user.id,
      conversation_id,
      result.url,
    )
    const url = storedUrl ?? result.url

    let messageId: string | null = null
    if (conversation_id) {
      messageId = await attachImageUrlToLatestAssistantMessage(supabase, conversation_id, url)
    }

    return NextResponse.json({
      url,
      provider: result.provider,
      prompt: safePrompt,
      persisted: Boolean(storedUrl),
      message_id: messageId,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    const message = error instanceof Error ? error.message : '图片生成失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

interface GenerateResult {
  url: string
  provider: string
}

// Provider 配置：{ key: 环境变量名, fn: 生成函数 }
const PROVIDER_MAP: Record<string, { keyEnv: string; fn: (p: string, s: string, ar: string) => Promise<GenerateResult> }> = {
  seedance:  { keyEnv: 'ARK_API_KEY',     fn: generateWithSeedDance },
  labnana:   { keyEnv: 'LABNANA_API_KEY',  fn: generateWithLabNana },
  cogview:   { keyEnv: 'GLM_API_KEY',      fn: (p) => generateWithCogView(p) },
  dalle:     { keyEnv: 'OPENAI_API_KEY',   fn: (p) => generateWithDallE(p) },
}

// 默认优先级顺序：labnana > seedance > dalle > cogview
const DEFAULT_ORDER = ['labnana', 'seedance', 'dalle', 'cogview']

/**
 * 根据环境变量选择 Provider 生成图片
 * IMAGE_PROVIDER: 指定首选（排第一，其余按默认顺序）
 * IMAGE_PROVIDER_ORDER: 自定义完整优先级（逗号分隔，如 "labnana,seedance,dalle"）
 */
async function generateImage(
  prompt: string,
  size: string,
  aspectRatio: string,
  requestProvider?: string
): Promise<GenerateResult> {
  // 优先级：请求指定 > IMAGE_PROVIDER_ORDER > IMAGE_PROVIDER > 默认
  const customOrder = process.env.IMAGE_PROVIDER_ORDER
    ?.split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => PROVIDER_MAP[s])

  let order: string[]
  const reqProv = requestProvider?.toLowerCase()
  if (reqProv && PROVIDER_MAP[reqProv]) {
    // 前端 UI 指定的 provider 排第一，其余保持环境变量/默认顺序
    const base = customOrder?.length ? customOrder : [...DEFAULT_ORDER]
    order = [reqProv, ...base.filter(p => p !== reqProv)]
  } else if (customOrder?.length) {
    order = customOrder
  } else {
    const preferred = process.env.IMAGE_PROVIDER?.toLowerCase()
    order = preferred && PROVIDER_MAP[preferred]
      ? [preferred, ...DEFAULT_ORDER.filter(p => p !== preferred)]
      : [...DEFAULT_ORDER]
  }

  let lastError: Error | null = null

  for (const name of order) {
    const provider = PROVIDER_MAP[name]
    if (!provider || !process.env[provider.keyEnv]) continue

    try {
      console.log(`[Image] Trying provider: ${name}`)
      return await provider.fn(prompt, size, aspectRatio)
    } catch (err) {
      console.warn(`[Image] ${name} failed:`, err)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('未配置图片生成 API Key（需要 ARK_API_KEY、LABNANA_API_KEY、GLM_API_KEY 或 OPENAI_API_KEY）')
}

/**
 * LabNana 图片生成
 * 正确端点：https://api.labnana.com/openapi/v1/images/generation
 * 请求体：{ provider, prompt, imageConfig: { imageSize, aspectRatio } }
 * 响应体：candidates[0].content.parts[0].inlineData（base64）
 */
async function generateWithLabNana(
  prompt: string,
  size: string,
  aspectRatio: string
): Promise<GenerateResult> {
  const res = await fetch('https://api.labnana.com/openapi/v1/images/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LABNANA_API_KEY}`,
    },
    body: JSON.stringify({
      provider: 'google',
      prompt,
      imageConfig: {
        imageSize: size || '1K',
        aspectRatio: aspectRatio || '1:1',
      },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const code = errBody?.code
    if (code === 21007) throw new Error('LabNana API Key 无效，请检查 LABNANA_API_KEY')
    if (code === 21008) throw new Error('LabNana 积分不足，请充值')
    if (code === 21009) throw new Error('图片内容不符合安全策略，请修改描述')
    throw new Error(`LabNana API error: ${res.status} ${JSON.stringify(errBody)}`)
  }

  const data = await res.json()

  // LabNana 返回 base64 图片数据
  const candidate = data.candidates?.[0]
  const inlineData = candidate?.content?.parts?.[0]?.inlineData
  if (!inlineData?.data) throw new Error('LabNana 未返回图片数据')

  // 转为 data URI，前端可直接用作 <img src>
  const mimeType = inlineData.mimeType || 'image/png'
  const dataUri = `data:${mimeType};base64,${inlineData.data}`

  return { url: dataUri, provider: 'labnana' }
}

/**
 * SeedDance / 火山引擎 Doubao Seedream 5.0 图片生成
 * Endpoint: https://ark.cn-beijing.volces.com/api/v3/images/generations
 * 返回 URL，快速（~1.8s），支持中文 prompt
 */
async function generateWithSeedDance(
  prompt: string,
  size: string,
  aspectRatio: string
): Promise<GenerateResult> {
  // 将尺寸+宽高比映射到 Seedream 支持的分辨率（最小 3686400 像素）
  const ratioSizeMap: Record<string, string> = {
    '1:1':  '2048x2048',
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '4:3':  '2304x1728',
    '3:4':  '1728x2304',
    '3:2':  '2304x1536',
    '2:3':  '1536x2304',
  }
  const qualitySizeMap: Record<string, string> = {
    '1K': '2048x2048',
    '2K': '2048x2048',
    '4K': '4096x4096',
  }
  const imageSize = ratioSizeMap[aspectRatio] || qualitySizeMap[size] || '2048x2048'

  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'doubao-seedream-5-0-260128',
      prompt,
      size: imageSize,
      watermark: false,
      response_format: 'url',
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`SeedDance API error: ${res.status} ${JSON.stringify(errBody)}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url || ''
  if (!url) throw new Error('SeedDance 未返回图片 URL')

  return { url, provider: 'seedance' }
}

/**
 * 智谱 CogView 图片生成
 */
async function generateWithCogView(prompt: string): Promise<GenerateResult> {
  const baseUrl = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas')
    .replace(/\/v4\/.*$/, '')
    .replace(/\/v4\/?$/, '')

  const res = await fetch(`${baseUrl}/v4/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'cogview-3-flash',
      prompt,
      size: '512x512',
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`CogView API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url || ''
  if (!url) throw new Error('CogView 未返回图片 URL')

  return { url, provider: 'cogview' }
}

/**
 * OpenAI DALL-E 图片生成
 */
async function generateWithDallE(prompt: string): Promise<GenerateResult> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DALL-E API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url || ''
  if (!url) throw new Error('DALL-E 未返回图片 URL')

  return { url, provider: 'dall-e' }
}
