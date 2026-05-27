import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  isParentVerificationPath,
  isParentVerifiedCookie,
  PARENT_VERIFIED_COOKIE,
  PARENT_VERIFY_PATH,
} from '@/lib/supabase/parent-verify'

export function isParentVerified(request: NextRequest, userId: string): boolean {
  return isParentVerifiedCookie(request.cookies.get(PARENT_VERIFIED_COOKIE)?.value, userId)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.warn('[middleware] auth getUser:', error.message)
    } else {
      user = data.user
    }
  } catch {
    console.warn('[middleware] auth fetch failed')
  }

  const pathname = request.nextUrl.pathname

  // 已登录访问 landing → 默认进入孩子端
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/child'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // 未登录且访问受保护路由 → 跳转登录
  const protectedPaths = ['/parent', '/child']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  // 已登录 → 单账号模型：所有用户都可访问 /child，/parent 需 PIN 验证
  if (user && isProtected) {
    // 家长区统一 PIN 验证（不区分 role，任何已登录用户通过 PIN 即可进入）
    if (
      pathname.startsWith('/parent') &&
      !isParentVerificationPath(pathname) &&
      !isParentVerified(request, user.id)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = PARENT_VERIFY_PATH
      url.search = ''
      url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(url)
    }
    // /child 路径：任何已登录用户直接放行
  }

  // 已登录且访问登录页 → 跳转首页
  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
      const target = new URL(redirectTo, request.nextUrl.origin)
      url.pathname = target.pathname
      url.search = target.search
    } else {
      url.pathname = '/child'
      url.search = ''
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
