import Link from 'next/link'

const MODES = [
  {
    emoji: '🌿',
    title: '探索 Explore',
    desc: '孩子主动提问，精灵陪伴发现。保护好奇心，在对话里自然触达知识点。',
  },
  {
    emoji: '🌸',
    title: '任务 Quest',
    desc: '对齐学期大纲，用故事情境替代刷题。追问思考过程，错了当场引导理解。',
  },
  {
    emoji: '🎨',
    title: '创造 Create',
    desc: '看图说话、编故事、数学探索、英语冒险——在表达中练习，而不是被动接受题目。',
  },
]

const FEATURES = [
  { emoji: '🧚', title: '花园精灵', desc: '会呼吸、会眨眼的学习伙伴，语音和触摸并重' },
  { emoji: '🌳', title: '成长花园', desc: '每次学习让植物生长，掌握知识点就开花' },
  { emoji: '📊', title: '家长洞察', desc: 'AI 质性成长报告，而不只是正确率' },
  { emoji: '🔒', title: '安全守护', desc: '内容过滤 + PIN 保护家长区，适合儿童使用' },
]

export function LandingPage() {
  return (
    <main className="min-h-screen watercolor-bg">
      {/* Hero */}
      <section className="px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl md:text-7xl mb-6 animate-card-enter">🌻</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground animate-card-enter">
            Anna&apos;s Garden
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-3 animate-card-enter">
            让一年级孩子在 AI 花园精灵陪伴下，通过说话、探索和创造学语文、数学、英语。
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-10 animate-card-enter">
            基础技能在故事里自然发生，好奇心不被刷题杀死。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-card-enter">
            <Link
              href="/auth/login?mode=signup"
              className="btn-primary inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white rounded-soft touch-target"
            >
              申请试用
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-soft touch-target border border-amber-200/60 bg-white/40 text-foreground hover:bg-white/60 transition-colors"
            >
              已有账号登录
            </Link>
          </div>
        </div>
      </section>

      {/* 三种模式 */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-foreground">
            三种学习模式，交织在花园体验里
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {MODES.map((mode, i) => (
              <article
                key={mode.title}
                className="glass-card rounded-soft p-6 animate-card-enter"
                style={{ '--stagger': `${i * 80}ms` } as React.CSSProperties}
              >
                <div className="text-4xl mb-3">{mode.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{mode.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{mode.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 特性 */}
      <section className="px-4 py-12 md:py-16 bg-white/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-foreground">
            为家庭 MVP 试用打造
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((feature, i) => (
              <article
                key={feature.title}
                className="card rounded-soft p-5 flex gap-4 animate-card-enter"
                style={{ '--stagger': `${i * 60}ms` } as React.CSSProperties}
              >
                <span className="text-3xl shrink-0">{feature.emoji}</span>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 对比 */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto glass-card rounded-soft p-8 md:p-10">
          <h2 className="text-2xl font-bold text-center mb-6 text-foreground">
            不是刷题 App，是 AI 原生学伴
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">传统：</span>
              家长出题 → 孩子点选 ABCD → 看正确率
            </p>
            <p>
              <span className="font-semibold text-foreground">Anna&apos;s Garden：</span>
              孩子提问 → 精灵陪探索 → 花园开花 → 家长读 AI 成长笔记
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
          准备好和精灵一起进花园了吗？
        </h2>
        <p className="text-muted-foreground mb-8">
          当前为 MVP 试用阶段，适合 iPad / 平板竖屏使用
        </p>
        <Link
          href="/auth/login?mode=signup"
          className="btn-primary inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-white rounded-soft touch-target"
        >
          开始试用
        </Link>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-amber-200/30">
        <p>🧚 Anna&apos;s Garden — AI 原生儿童教育</p>
        <p className="mt-2">
          <Link href="/auth/login" className="underline hover:text-foreground">
            登录
          </Link>
          {' · '}
          MVP 试用阶段
        </p>
      </footer>
    </main>
  )
}
