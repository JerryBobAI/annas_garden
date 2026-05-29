import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isParentPinValid, userHasPersonalPin } from '@/lib/parent/check-pin'
import { hashParentPin, validatePinFormat } from '@/lib/parent/pin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  if (!(await userHasPersonalPin(supabase, user.id))) {
    return NextResponse.json({ error: '请先设置家长 PIN' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as {
    currentPin?: string
    newPin?: string
    confirmPin?: string
  } | null

  const currentPin = body?.currentPin?.trim() ?? ''
  const newPin = body?.newPin?.trim() ?? ''
  const confirmPin = body?.confirmPin?.trim() ?? ''

  if (!currentPin) {
    return NextResponse.json({ error: '请输入当前 PIN' }, { status: 400 })
  }

  const validCurrent = await isParentPinValid(supabase, user.id, currentPin)
  if (!validCurrent) {
    return NextResponse.json({ error: '当前 PIN 不正确' }, { status: 401 })
  }

  const formatError = validatePinFormat(newPin)
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 })
  }
  if (newPin !== confirmPin) {
    return NextResponse.json({ error: '两次输入的新 PIN 不一致' }, { status: 400 })
  }
  if (newPin === currentPin) {
    return NextResponse.json({ error: '新 PIN 不能与当前 PIN 相同' }, { status: 400 })
  }

  const parentPinHash = await hashParentPin(newPin)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ parent_pin_hash: parentPinHash })
    .eq('id', user.id)

  if (updateError) {
    console.error('[parent/pin/change]', updateError.message)
    return NextResponse.json({ error: '更新 PIN 失败，请稍后重试' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
