'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { useRouter, useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen watercolor-bg flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'signup'>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'login',
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/child/onboarding`,
          },
        })
        if (error) throw error
        // 若 Supabase 关闭了邮箱确认，会立即返回 session
        if (data.session) {
          router.replace('/child/onboarding')
          return
        }
        setError('注册成功！请查看邮箱确认链接，确认后即可登录。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const defaultPath = '/child'
        const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
        const targetPath = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : defaultPath

        router.replace(targetPath)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen watercolor-bg flex items-center justify-center px-4">
      <div className="glass-card rounded-soft p-8 md:p-12 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌻</div>
          <h1 className="text-2xl font-bold" style={{ color: '#3A2E2C' }}>
            Anna&apos;s Garden
          </h1>
          <p className="text-sm mt-2" style={{ color: '#8B7355' }}>
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#3A2E2C' }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-amber-200/50 focus:outline-none focus:border-amber-400 transition-colors touch-target"
              style={{ color: '#3A2E2C' }}
              placeholder="请输入邮箱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#3A2E2C' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-amber-200/50 focus:outline-none focus:border-amber-400 transition-colors touch-target"
              style={{ color: '#3A2E2C' }}
              placeholder="请输入密码（至少6位）"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm" style={{ color: '#8B7355' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary px-6 py-3 text-white font-semibold rounded-xl touch-target disabled:opacity-50"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* 切换模式 */}
        <div className="text-center mt-6">
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-sm hover:underline" style={{ color: '#FFB300' }}
          >
            {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <BackIconLink href="/" label="返回首页" />
        </div>
      </div>
    </main>
  )
}
