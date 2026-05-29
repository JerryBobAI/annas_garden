import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userHasPersonalPin } from '@/lib/parent/check-pin'
import { getLegacyEnvParentPin } from '@/lib/parent/pin'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const hasPersonalPin = await userHasPersonalPin(supabase, user.id)
  const legacyConfigured = !!getLegacyEnvParentPin()

  return NextResponse.json({
    hasPersonalPin,
    needsSetup: !hasPersonalPin,
    canVerifyWithLegacy: !hasPersonalPin && legacyConfigured,
  })
}
