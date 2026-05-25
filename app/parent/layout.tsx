import React, { Suspense } from 'react'

/**
 * 家长端 Loading 骨架屏
 */
function ParentLoading() {
  return (
    <div className="min-h-screen watercolor-bg flex items-center justify-center">
      <p className="text-muted-brown text-lg">加载中...</p>
    </div>
  )
}

/**
 * 家长端布局
 * - Suspense 加载状态
 * - 预留 ErrorBoundary (error.tsx)
 * - 不改变现有页面结构
 */
export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<ParentLoading />}>
      {children}
    </Suspense>
  )
}
