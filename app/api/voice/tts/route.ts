import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getVoiceConfig } from '@/lib/voice/config'

/**
 * POST /api/voice/tts
 * 语音合成 — 将文字转为语音
 * 支持多个 provider：openai / siliconflow / browser（browser 端走客户端不经此路由）
 */
export async function POST(request: NextRequest) {
  // 1. 认证检查
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // 2. 检查 provider
  const config = getVoiceConfig()
  if (config.provider === 'browser') {
    return NextResponse.json(
      { error: '当前语音模式使用浏览器内置合成，无需调用此接口', provider: 'browser' },
      { status: 400 }
    )
  }

  // 3. 解析请求体
  const body = await request.json()
  const { text } = body as { text?: string }

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: '没有内容可以说' }, { status: 400 })
  }

  if (text.length > 4096) {
    return NextResponse.json({ error: '精灵说不了这么多话' }, { status: 400 })
  }

  // 4. 调用 TTS API（OpenAI 兼容格式）
  try {
    const openai = new OpenAI({
      apiKey: config.tts.apiKey,
      baseURL: config.tts.baseUrl,
    })

    const response = await openai.audio.speech.create({
      model: config.tts.model,
      voice: config.tts.voice as string,
      input: text,
      response_format: 'mp3',
    })

    // 5. 返回音频数据
    const audioBuffer = Buffer.from(await response.arrayBuffer())

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'X-Voice-Provider': config.provider,
      },
    })
  } catch (error) {
    console.error(`TTS error [${config.provider}]:`, error)
    return NextResponse.json(
      { error: '精灵的嗓子暂时哑了' },
      { status: 502 }
    )
  }
}
