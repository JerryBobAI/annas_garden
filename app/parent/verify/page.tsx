'use client'

import { Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BackIconLink } from '@/components/shared/back-icon-link'

type PinStatus = {
  hasPersonalPin: boolean
  needsSetup: boolean
  canVerifyWithLegacy: boolean
}

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

function PinInput({
  value,
  onChange,
  placeholder,
  name,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  name: string
}) {
  return (
    <input
      type="password"
      inputMode="numeric"
      name={name}
      autoComplete="off"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-white/60 border border-amber-200/50 focus:outline-none focus:border-amber-400 transition-colors touch-target text-center tracking-widest"
      style={{ color: '#3A2E2C' }}
    />
  )
}

function ParentVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emptySubscribe = () => () => {}
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const [status, setStatus] = useState<PinStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [pin, setPin] = useState('')
  const [setupPin, setSetupPin] = useState('')
  const [setupConfirm, setSetupConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/parent/pin/status', { credentials: 'same-origin' })
        if (!res.ok) throw new Error('无法加载 PIN 状态')
        const data = (await res.json()) as PinStatus
        setStatus(data)
      } catch {
        setError('加载失败，请刷新重试')
      } finally {
        setStatusLoading(false)
      }
    }
    loadStatus()
  }, [])

  function redirectAfterSuccess() {
    const redirectTo = searchParams.get('redirectTo')
    const target = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/parent'
    router.replace(target)
  }

  async function handleVerify(e: React.FormEvent) {
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
        if (data.code === 'needs_setup') {
          setStatus((s) => (s ? { ...s, needsSetup: true, hasPersonalPin: false } : s))
        }
        throw new Error(data.error || '验证失败')
      }
      redirectAfterSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!setupPin || !setupConfirm) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/parent/pin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pin: setupPin, confirmPin: setupConfirm }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || '设置失败')
      }
      redirectAfterSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted || statusLoading) {
    return <VerifyLoading />
  }

  const showSetup = status?.needsSetup
  const showVerify = status?.hasPersonalPin || status?.canVerifyWithLegacy

  return (
    <VerifyShell>
      <div className="glass-card rounded-soft p-8 w-full max-w-md space-y-8">
        {showSetup && (
          <section>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3" aria-hidden>🌿</div>
              <h1 className="text-2xl font-bold text-primary-dark">设置家庭家长 PIN</h1>
              <p className="text-sm mt-2 text-muted-brown">
                每个账户独立 PIN，仅家长知道。4–6 位数字，进入家长区时使用。
              </p>
            </div>

            <form onSubmit={handleSetup} className="space-y-3">
              <PinInput
                name="setup-pin"
                value={setupPin}
                onChange={setSetupPin}
                placeholder="输入 PIN"
              />
              <PinInput
                name="setup-pin-confirm"
                value={setupConfirm}
                onChange={setSetupConfirm}
                placeholder="再次输入 PIN"
              />
              <button
                type="submit"
                disabled={isSubmitting || setupPin.length < 4 || setupConfirm.length < 4}
                className="w-full btn-primary px-6 py-3 text-white font-semibold rounded-xl touch-target disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存并进入家长区'}
              </button>
            </form>
          </section>
        )}

        {showSetup && showVerify && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(58,46,44,0.12)' }} />
            <span className="text-xs text-muted-brown">或</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(58,46,44,0.12)' }} />
          </div>
        )}

        {showVerify && (
          <section>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3" aria-hidden>🔐</div>
              <h2 className="text-xl font-bold text-primary-dark">
                {showSetup ? '已有 PIN，直接验证' : '家长验证'}
              </h2>
              <p className="text-sm mt-2 text-muted-brown">
                进入家长区前，请输入家长 PIN。
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <PinInput
                name="parent-pin"
                value={pin}
                onChange={setPin}
                placeholder="请输入家长 PIN"
              />
              <button
                type="submit"
                disabled={isSubmitting || !pin.trim()}
                className="w-full btn-primary px-6 py-3 text-white font-semibold rounded-xl touch-target disabled:opacity-50"
              >
                {isSubmitting ? '验证中...' : '进入家长区'}
              </button>
            </form>
          </section>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm" style={{ color: '#8B7355' }}>
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <BackIconLink href="/child" label="返回孩子花园" />
        </div>
      </div>
    </VerifyShell>
  )
}
