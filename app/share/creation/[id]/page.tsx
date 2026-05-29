import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCreationPreview } from '@/lib/share/public-creation'
import { getSiteUrl } from '@/lib/site-url'
import ShareLinkButton from '@/components/shared/share-link-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const creation = await getPublicCreationPreview(id)
  const siteUrl = getSiteUrl()
  const sharePath = `/share/creation/${id}`

  if (!creation) {
    return {
      title: '创作分享 · 安娜的花园',
      openGraph: {
        title: '安娜的花园 · 孩子创作',
        description: '在 AI 花园精灵陪伴下完成的创作',
        url: `${siteUrl}${sharePath}`,
        images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      },
    }
  }

  const title = `${creation.cover_emoji} ${creation.title}`
  const description = `孩子在安娜的花园完成了 ${creation.word_count} 字的创作，快来看看吧！`

  return {
    title: `${title} · 安娜的花园`,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}${sharePath}`,
      type: 'article',
      locale: 'zh_CN',
      siteName: "Anna's Garden",
      images: [
        {
          url: `/share/creation/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/share/creation/${id}/opengraph-image`],
    },
  }
}

export default async function ShareCreationPage({ params }: PageProps) {
  const { id } = await params
  const creation = await getPublicCreationPreview(id)

  if (!creation) {
    return (
      <main className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🌻</div>
        <h1 className="text-xl font-bold text-primary-dark mb-2">链接暂时无法打开</h1>
        <p className="text-sm text-muted-brown mb-6">
          创作可能尚未完成，或分享功能需要服务端配置。你仍可以分享安娜的花园主页。
        </p>
        <Link href="/" className="btn-primary px-6 py-3 text-white rounded-full text-sm">
          了解安娜的花园
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <div className="text-7xl mb-4 animate-card-enter">{creation.cover_emoji}</div>
        <h1 className="text-2xl font-bold text-primary-dark mb-2">{creation.title}</h1>
        <p className="text-muted-brown mb-1">Anna & 花园精灵 ✨</p>
        <p className="text-sm text-muted-brown mb-8">{creation.word_count} 字 · 已完成</p>

        <div className="card rounded-soft p-6 mb-8 text-left">
          <p className="text-sm text-primary-dark leading-relaxed">
            这是孩子在 <strong>安娜的花园</strong> 里完成的一篇创作。登录后即可在「我的创作」中阅读全文。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <ShareLinkButton
            href={`/share/creation/${id}`}
            title={`${creation.title} · 安娜的花园`}
            text={`看看我在安娜的花园里的创作：${creation.title}`}
            label="🔗 分享给家人"
            variant="primary"
          />
          <Link
            href="/auth/login?mode=signup"
            className="px-6 py-2 text-sm rounded-full touch-target border"
            style={{ color: '#8B7355', borderColor: 'rgba(139,115,85,0.3)' }}
          >
            申请试用
          </Link>
        </div>
      </div>
    </main>
  )
}
