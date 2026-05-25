import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-4">
      <div className="glass-card rounded-soft p-10 md:p-14 text-center max-w-lg w-full animate-card-enter">
        <div className="text-6xl mb-4">🧚</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
          Anna&apos;s Garden
        </h1>
        <p className="text-lg mb-10" style={{ color: '#5D4E4A' }}>
          和花园精灵一起探索、任务、创造
        </p>

        <Link
          href="/child"
          className="btn-primary inline-flex items-center justify-center w-full px-8 py-4 text-lg font-semibold text-white rounded-soft touch-target"
        >
          💬 开始使用
        </Link>

        <p className="mt-6 text-sm" style={{ color: '#8B7355' }}>
          已有账号会直接登录后进入花园
        </p>
      </div>

      <footer className="mt-12 py-6 text-center text-sm" style={{ color: '#8B7355' }}>
        <p>🧚 Anna&apos;s Garden</p>
      </footer>
    </main>
  )
}
