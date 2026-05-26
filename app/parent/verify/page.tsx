'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BackIconLink } from '@/components/shared/back-icon-link'

function VerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen watercolor-bg flex items-center justify-center px-4" suppressHydrationWarning>
      {children}
    </main>
  )
}

function VerifyLoading() {
  return (
    <VerifyShell>
      <span className="text-4xl" aria-hidden>🔐</span>
    </VerifyShell>
  )
}

export default function ParentVerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <ParentVerifyForm />
    </Suspense>
  )
}

function ParentVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedPin = pin.trim()
    if (!trimmedPin) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/parent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pin: trimmedPin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || '验证失败')
      }

      const redirectTo = searchParams.get('redirectTo')
      const target = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/parent'
      router.replace(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) {
    return <VerifyLoading />
  }

  return (
    <VerifyShell>
      <div className="glass-card rounded-soft p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" aria-hidden>🔐</div>
          <h1 className="text-2xl font-bold text-primary-dark">家长验证</h1>
          <p className="text-sm mt-2 text-muted-brown">
            进入家长区前，请输入家长专用 PIN。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            name="parent-pin"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="请输入家长 PIN"
            className="w-full px-4 py-3 rounded-xl bg-white/60 border border-amber-200/50 focus:outline-none focus:border-amber-400 transition-colors touch-target text-center tracking-widest"
            style={{ color: '#3A2E2C' }}
          />

          {error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm" style={{ color: '#8B7355' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !pin.trim()}
            className="w-full btn-primary px-6 py-3 text-white font-semibold rounded-xl touch-target disabled:opacity-50"
          >
            {isSubmitting ? '验证中...' : '进入家长区'}
          </button>
        </form>

        <div className="flex justify-center mt-5">
          <BackIconLink href="/child" label="返回孩子花园" />
        </div>
      </div>
    </VerifyShell>
  )
}
