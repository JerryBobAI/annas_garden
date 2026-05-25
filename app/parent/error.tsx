'use client'

/**
 * 家长端错误边界
 */
export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-6">
      <h2 className="text-xl font-bold text-primary-dark mb-4">
        出了点问题
      </h2>
      <p className="text-muted-brown text-center mb-6">
        请稍后重试，如果问题持续请联系技术支持
      </p>
      <button
        onClick={reset}
        className="btn-primary px-8 py-3 text-white font-semibold rounded-soft"
      >
        重新加载
      </button>
    </div>
  )
}
