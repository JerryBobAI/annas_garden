'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

const LONG_PRESS_MS = 800

interface AccountSecretSwitchWrapProps {
  children: ReactNode
  className?: string
  accountLabel?: string
}

function AccountSwitchDialog({
  accountLabel,
  isSigningOut,
  onCancel,
  onConfirm,
}: {
  accountLabel: string
  isSigningOut: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(42, 32, 28, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-switch-title"
      onClick={() => {
        if (!isSigningOut) onCancel()
      }}
    >
      <div
        className="w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-lg animate-badge-enter"
        style={{
          background: 'linear-gradient(180deg, #FFFBF5 0%, #FFFFFF 100%)',
          border: '1px solid rgba(255, 179, 0, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-8 pb-2 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: 'rgba(255, 179, 0, 0.12)' }}
            aria-hidden
          >
            🔄
          </div>
          <h2
            id="account-switch-title"
            className="text-xl font-bold mb-2"
            style={{ color: '#3A2E2C' }}
          >
            切换账号
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#8B7355' }}>
            退出后可用其他账号登录
          </p>
        </div>

        <div className="mx-6 mb-6 rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(255, 248, 235, 0.9)' }}>
          <p className="text-xs mb-1" style={{ color: '#8B7355' }}>当前登录</p>
          <p className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>{accountLabel}</p>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: '#A89888' }}>
            每个账号的花园记录会分开保存
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onConfirm}
            className="w-full btn-primary py-3.5 rounded-2xl text-base font-semibold text-white touch-target disabled:opacity-50"
          >
            {isSigningOut ? '正在退出…' : '退出并切换账号'}
          </button>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-medium touch-target disabled:opacity-50"
            style={{ color: '#8B7355' }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 家长隐藏入口：长按孩子名字约 0.8s 弹出切换账号提醒，确认后才退出登录。
 */
export function AccountSecretSwitchWrap({
  children,
  className = '',
  accountLabel = '当前账号',
}: AccountSecretSwitchWrapProps) {
  const router = useRouter()
  const supabase = createClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!showDialog) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showDialog])

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onPointerDown: PointerEventHandler = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    clear()
    timerRef.current = setTimeout(() => {
      setShowDialog(true)
    }, LONG_PRESS_MS)
  }

  async function handleConfirmSwitch() {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.replace('/auth/login')
    } finally {
      setIsSigningOut(false)
      setShowDialog(false)
    }
  }

  return (
    <>
      <div
        className={`select-none touch-target ${className}`.trim()}
        style={{ touchAction: 'manipulation' }}
        onPointerDown={onPointerDown}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {showDialog && portalReady && createPortal(
        <AccountSwitchDialog
          accountLabel={accountLabel}
          isSigningOut={isSigningOut}
          onCancel={() => setShowDialog(false)}
          onConfirm={handleConfirmSwitch}
        />,
        document.body,
      )}
    </>
  )
}
