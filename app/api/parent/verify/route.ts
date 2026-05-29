import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isParentPinValid, userHasPersonalPin } from '@/lib/parent/check-pin'
import { getLegacyEnvParentPin } from '@/lib/parent/pin'
import { setParentVerifiedCookie } from '@/lib/parent/verify-session'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const hasPersonalPin = await userHasPersonalPin(supabase, user.id)
  const legacyPin = getLegacyEnvParentPin()

  if (!hasPersonalPin && !legacyPin) {
    return NextResponse.json(
      { error: '尚未设置家长 PIN，请先完成首次设置', code: 'needs_setup' },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => null)) as { pin?: string } | null
  const pin = body?.pin?.trim()

  if (!pin) {
    return NextResponse.json({ error: '请输入家长 PIN' }, { status: 400 })
  }

  const valid = await isParentPinValid(supabase, user.id, pin)
  if (!valid) {
    return NextResponse.json({ error: '家长 PIN 不正确' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  setParentVerifiedCookie(response, user.id)
  return response
}
