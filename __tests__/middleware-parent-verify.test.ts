import { isParentVerificationPath, isParentVerifiedCookie } from '@/lib/supabase/parent-verify'

describe('parent verification middleware helpers', () => {
  it('识别家长验证页，避免验证页重定向到自己', () => {
    expect(isParentVerificationPath('/parent/verify')).toBe(true)
    expect(isParentVerificationPath('/parent')).toBe(false)
    expect(isParentVerificationPath('/parent/review')).toBe(false)
  })

  it('验证 cookie 必须绑定当前用户', () => {
    expect(isParentVerifiedCookie('parent-1', 'parent-1')).toBe(true)
    expect(isParentVerifiedCookie('parent-2', 'parent-1')).toBe(false)
    expect(isParentVerifiedCookie(undefined, 'parent-1')).toBe(false)
  })
})
