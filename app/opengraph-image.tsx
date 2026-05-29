import { ImageResponse } from 'next/og'

export const alt = "Anna's Garden - 安娜的花园"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
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
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 24 }}>🌱</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#3A2E2C',
            marginBottom: 16,
          }}
        >
          Anna&apos;s Garden
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#8B7355',
            marginBottom: 8,
          }}
        >
          安娜的花园
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#6B5344',
            maxWidth: 900,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          AI 花园精灵 · 探索 · 任务 · 创造
        </div>
      </div>
    ),
    { ...size },
  )
}
