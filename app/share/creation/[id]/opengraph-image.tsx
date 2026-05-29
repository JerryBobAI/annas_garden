import { ImageResponse } from 'next/og'
import { getPublicCreationPreview } from '@/lib/share/public-creation'

export const alt = '安娜的花园 · 孩子创作'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CreationOpenGraphImage({ params }: Props) {
  const { id } = await params
  const creation = await getPublicCreationPreview(id)

  const emoji = creation?.cover_emoji ?? '📖'
  const title = creation?.title ?? '孩子创作'
  const subtitle = creation
    ? `${creation.word_count} 字 · 安娜的花园`
    : '安娜的花园 · AI 儿童教育'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF8F0 0%, #FDF6E3 45%, #E8F5E9 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 48,
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 20 }}>{emoji}</div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: '#3A2E2C',
            marginBottom: 16,
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, color: '#8B7355', marginBottom: 12 }}>{subtitle}</div>
        <div style={{ fontSize: 22, color: '#6B5344' }}>🧚 花园精灵陪伴式学习</div>
      </div>
    ),
    { ...size },
  )
}
