import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userHasPersonalPin } from '@/lib/parent/check-pin'
import { hashParentPin, validatePinFormat } from '@/lib/parent/pin'
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

  if (await userHasPersonalPin(supabase, user.id)) {
    return NextResponse.json({ error: '已设置过家长 PIN，请在设置中修改' }, { status: 409 })
  }

  const body = (await request.json().catch(() => null)) as {
    pin?: string
    confirmPin?: string
  } | null

  const pin = body?.pin?.trim() ?? ''
  const confirmPin = body?.confirmPin?.trim() ?? ''

  const formatError = validatePinFormat(pin)
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 })
  }
  if (pin !== confirmPin) {
    return NextResponse.json({ error: '两次输入的 PIN 不一致' }, { status: 400 })
  }

  const parentPinHash = await hashParentPin(pin)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ parent_pin_hash: parentPinHash })
    .eq('id', user.id)

  if (updateError) {
    console.error('[parent/pin/setup]', updateError.message)
    return NextResponse.json({ error: '保存 PIN 失败，请稍后重试' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true, setup: true })
  setParentVerifiedCookie(response, user.id)
  return response
}
