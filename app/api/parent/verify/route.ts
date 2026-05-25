import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const COOKIE_NAME = 'anna_parent_verified'
const MAX_AGE_SECONDS = 30 * 60

function getExpectedPin(): string | undefined {
  return process.env.PARENT_ACCESS_PIN || process.env.PARENT_AREA_PIN
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') {
    return NextResponse.json({ error: '只有家长账号可以进入家长区' }, { status: 403 })
  }

  const expectedPin = getExpectedPin()
  if (!expectedPin) {
    return NextResponse.json(
      { error: '尚未配置家长区 PIN，请在 .env.local 设置 PARENT_ACCESS_PIN' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null) as { pin?: string } | null
  const pin = body?.pin?.trim()

  if (!pin || pin !== expectedPin) {
    return NextResponse.json({ error: '家长验证码不正确' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/parent',
  })

  return response
}
