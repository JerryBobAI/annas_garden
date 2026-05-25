import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getVoiceConfig } from '@/lib/voice/config'

/**
 * POST /api/voice/stt
 * 语音识别 — 将音频转为文字
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
      { error: '当前语音模式使用浏览器内置识别，无需调用此接口', provider: 'browser' },
      { status: 400 }
    )
  }

  // 3. 提取音频文件
  const formData = await request.formData()
  const audioFile = formData.get('audio') as File | null
  const language = (formData.get('language') as string) || undefined

  if (!audioFile) {
    return NextResponse.json({ error: '没有收到音频' }, { status: 400 })
  }

  // 4. 验证文件大小 (≤ 25MB)
  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: '录音太长了' }, { status: 413 })
  }

  // 5. 调用 STT API（OpenAI 兼容格式）
  try {
    const openai = new OpenAI({
      apiKey: config.stt.apiKey,
      baseURL: config.stt.baseUrl,
    })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: config.stt.model,
      language: language || undefined,
      response_format: 'json',
    })

    return NextResponse.json({
      text: transcription.text || '',
      language: language || 'auto',
      provider: config.provider,
    })
  } catch (error) {
    console.error(`STT error [${config.provider}]:`, error)
    return NextResponse.json(
      { error: '精灵的耳朵暂时不太灵' },
      { status: 502 }
    )
  }
}
