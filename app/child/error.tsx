'use client'

/**
 * 孩子端错误边界
 * 显示精灵困惑表情 + 友好错误提示 + 重试按钮
 */
export default function ChildError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-6">
      <div className="text-7xl mb-6 animate-badge-enter">😵‍💫</div>
      <h2 className="text-xl font-bold text-primary-dark mb-2 animate-text-pop">
        哎呀，出了点小问题
      </h2>
      <p className="text-muted-brown text-center mb-8 animate-text-pop-delay">
        花园精灵迷路了，让我们帮它找到回来的路吧
      </p>
      <button
        onClick={reset}
        className="btn-primary px-8 py-4 text-white font-semibold rounded-soft touch-target animate-text-pop-delay"
      >
        重新试试 🔄
      </button>
    </div>
  )
}
