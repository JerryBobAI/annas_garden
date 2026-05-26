'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, type PointerEventHandler, type ReactNode } from 'react'

const LONG_PRESS_MS = 800

/**
 * 家长隐藏入口：长按「花园精灵」约 0.8s 进入家长区（经 PIN 验证）。
 * 不在 UI 上提示，避免孩子误触。
 */
export function useSecretHomeLongPress() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      router.push('/parent/verify?redirectTo=%2Fparent')
    }, LONG_PRESS_MS)
  }

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

export function FairySecretHomeWrap({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const handlers = useSecretHomeLongPress()

  return (
    <div
      className={`select-none touch-target ${className}`.trim()}
      style={{ touchAction: 'manipulation' }}
      aria-label="花园精灵"
      {...handlers}
    >
      {children}
    </div>
  )
}
