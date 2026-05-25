'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('注册成功！请查看邮箱确认链接。')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const userId = data.user?.id
        const { data: profile } = userId
          ? await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
          : { data: null }

        const defaultPath = profile?.role === 'parent' ? '/parent' : '/child'
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

        {/* 返回首页 */}
        <div className="text-center mt-4">
          <Link href="/" className="text-sm" style={{ color: '#8B7355' }}>
            ← 返回首页
          </Link>
        </div>
      </div>
    </main>
  )
}
