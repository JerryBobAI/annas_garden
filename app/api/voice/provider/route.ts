import { NextResponse } from 'next/server'
import { getVoiceProvider } from '@/lib/voice/config'

/**
 * GET /api/voice/provider
 * 返回当前语音 provider，让客户端知道该走服务端还是浏览器端
 */
export async function GET() {
  return NextResponse.json({ provider: getVoiceProvider() })
}
