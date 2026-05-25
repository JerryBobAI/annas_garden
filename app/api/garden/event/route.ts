import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  applyGardenEvent,
  type GardenSupabaseClient,
} from '@/lib/garden/events'
import {
  type GardenEventType,
  type Subject,
} from '@/lib/garden/growth'

/**
 * POST /api/garden/event
 * 处理来自 AI 对话的花园事件
 * Body: { event, conversationId, knowledgeTags, subject }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const body = await request.json()
  const {
    event,
    conversationId,
    knowledgeTags = [],
    subject,
  } = body as {
    event: GardenEventType
    conversationId?: string
    knowledgeTags?: string[]
    subject?: Subject
  }

  if (!event) {
    return NextResponse.json({ error: '缺少事件类型' }, { status: 400 })
  }

  try {
    const result = await applyGardenEvent({
      supabase: supabase as unknown as GardenSupabaseClient,
      childId: user.id,
      event,
      conversationId,
      knowledgeTags,
      subject,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Garden event error:', error)
    return NextResponse.json({ error: '花园更新失败' }, { status: 500 })
  }
}
