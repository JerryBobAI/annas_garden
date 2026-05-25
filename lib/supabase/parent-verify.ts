export const PARENT_VERIFY_PATH = '/parent/verify'
export const PARENT_VERIFIED_COOKIE = 'anna_parent_verified'

export function isParentVerifiedCookie(cookieValue: string | undefined, userId: string): boolean {
  return cookieValue === userId
}

export function isParentVerificationPath(pathname: string): boolean {
  return pathname === PARENT_VERIFY_PATH
}
