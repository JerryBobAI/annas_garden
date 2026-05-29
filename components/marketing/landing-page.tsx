import Link from 'next/link'
import ShareLinkButton from '@/components/shared/share-link-button'
import {
  IconCreate,
  IconExplore,
  IconFairyPartner,
  IconGardenCard,
  IconLogoSunflower,
  IconParentInsight,
  IconQuest,
  IconSafetyShield,
} from '@/components/icons/mode-icons'

const MODES = [
  {
    icon: IconExplore,
    title: '探索 Explore',
    desc: '孩子带着问题来，精灵带着故事答。知识点在对话里自然浮现，而不是先背再练。',
  },
  {
    icon: IconQuest,
    title: '任务 Quest',
    desc: '对齐课标与教材进度，用故事情境替代刷题。小学、初中、高中都可按学段配置。',
  },
  {
    icon: IconCreate,
    title: '创造 Create',
    desc: '讲故事、画数学、做英语冒险——表达本身就是学习，作品可保存、可分享。',
  },
] as const

const FEATURES = [
  {
    icon: IconFairyPartner,
    title: '花园精灵',
    desc: '会呼吸、会眨眼的学习伙伴，语音和触摸并重',
  },
  {
    icon: IconGardenCard,
    title: '成长花园',
    desc: '每次学习让植物生长，掌握知识点就开花',
  },
  {
    icon: IconParentInsight,
    title: '家长洞察',
    desc: 'AI 质性成长报告，而不只是正确率',
  },
  {
    icon: IconSafetyShield,
    title: '安全守护',
    desc: '内容过滤 + PIN 保护家长区，适合儿童使用',
  },
] as const

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="text-center">
          <div className="mb-4 flex justify-center">
            <IconLogoSunflower size={72} />
          </div>
          <h1 className="text-4xl font-bold text-[#3A2E2C] md:text-5xl">
            Anna&apos;s Garden
          </h1>
          <p className="mt-4 text-lg text-[#5D4E37] md:text-xl">
            让小学、初中、高中的孩子在 AI 花园精灵陪伴下，通过说话、探索和创造学语文、数学、英语。
          </p>
          <p className="mt-2 text-sm text-[#8B7355]">
            基础技能在故事里自然发生，好奇心不被刷题杀死。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#FFB300] px-8 py-3 font-semibold text-[#3A2E2C] shadow-md transition hover:bg-[#FFA000]"
            >
              申请试用
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full border-2 border-[#8B7355] px-8 py-3 font-semibold text-[#5D4E37] transition hover:bg-white/60"
            >
              已有账号登录
            </Link>
          </div>
        </header>

        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-[#3A2E2C]">
            三种学习模式，交织在花园体验里
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {MODES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#E8DCC8] bg-white/80 p-6 shadow-sm"
              >
                <div className="mb-3 flex justify-center">
                  <Icon size={48} />
                </div>
                <h3 className="font-semibold text-[#3A2E2C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8B7355]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-[#3A2E2C]">
            为家庭 MVP 试用打造
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-[#E8DCC8] bg-white/80 p-5 shadow-sm"
              >
                <div className="shrink-0">
                  <Icon size={44} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#3A2E2C]">{title}</h3>
                  <p className="mt-1 text-sm text-[#8B7355]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-[#E8DCC8] bg-white/90 p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#3A2E2C]">准备好开始了吗？</h2>
          <p className="mt-2 text-[#8B7355]">
            申请试用后，家长可配置孩子学段与教材，在 iPad 或平板上开始花园之旅。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-block rounded-full bg-[#FFB300] px-8 py-3 font-semibold text-[#3A2E2C] shadow-md transition hover:bg-[#FFA000]"
            >
              申请试用
            </Link>
            <ShareLinkButton
              href="/"
              title="Anna's Garden - 安娜的花园"
              text="AI 花园精灵陪伴式学习，覆盖小学到高中"
              label="分享给朋友"
              className="inline-block"
              variant="outline"
            />
          </div>
        </section>

        <footer className="mt-16 text-center text-sm text-[#8B7355]">
          <p>Anna&apos;s Garden · 安娜的花园</p>
          <p className="mt-1">AI 原生儿童教育 · MVP 家庭试用</p>
        </footer>
      </div>
    </div>
  )
}
