import { NextResponse } from 'next/server'
import { PARENT_VERIFIED_COOKIE } from '@/lib/supabase/parent-verify'

const MAX_AGE_SECONDS = 30 * 60

export function setParentVerifiedCookie(response: NextResponse, userId: string) {
  response.cookies.set(PARENT_VERIFIED_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/parent',
  })
}
