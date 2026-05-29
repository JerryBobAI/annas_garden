import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">🌻</div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#3A2E2C' }}>
        暂时连不上网络
      </h1>
      <p className="text-sm max-w-sm mb-8" style={{ color: '#8B7355' }}>
        安娜的花园需要和服务器说话才能聊天、画画。请检查 Wi‑Fi 后重试。
      </p>
      <Link
        href="/"
        className="btn-primary px-6 py-3 text-white font-semibold rounded-xl touch-target"
      >
        重新连接
      </Link>
    </main>
  )
}
