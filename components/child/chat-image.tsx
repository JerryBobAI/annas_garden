'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '@/lib/animations'

interface ChatImageProps {
  url: string
  alt?: string
  prompt?: string
}

async function downloadImage(url: string, filename = 'annas-garden-illustration.png') {
  if (url.startsWith('data:')) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    return
  }
  const res = await fetch(url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

async function shareImage(url: string, title: string) {
  if (url.startsWith('http') && navigator.share) {
    try {
      await navigator.share({ title, url })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return true
    }
  }

  if (navigator.share && !url.startsWith('data:')) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'annas-garden.png', { type: blob.type || 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, files: [file] })
        return true
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return true
    }
  }

  if (url.startsWith('http') && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }

  return false
}

/**
 * 对话中的 AI 生成图片：放大、保存、分享
 */
export default function ChatImage({ url, alt = '精灵画的图', prompt }: ChatImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [enlarged, setEnlarged] = useState(false)
  const [shareHint, setShareHint] = useState<string | null>(null)

  async function handleShare() {
    setShareHint(null)
    const result = await shareImage(url, '安娜的花园 · 精灵作品')
    if (result === 'copied') setShareHint('链接已复制')
    else if (result) setShareHint('已分享')
    else setShareHint('请用「保存」后从相册分享')
    setTimeout(() => setShareHint(null), 2500)
  }

  return (
    <>
      <div className="mt-2">
        <motion.div
          className="relative rounded-xl overflow-hidden cursor-pointer"
          style={{ maxWidth: 280 }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springGentle}
          onClick={() => setEnlarged(true)}
        >
          {!loaded && (
            <div className="w-full aspect-square bg-amber-50 rounded-xl flex items-center justify-center">
              <span className="text-2xl animate-hint-pulse">🎨</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className={`w-full rounded-xl border ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            style={{ borderColor: 'rgba(58,46,44,0.12)' }}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
          {loaded && prompt && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/35 to-transparent px-3 py-2 pointer-events-none">
              <p className="text-white text-xs truncate">{prompt}</p>
            </div>
          )}
        </motion.div>

        {loaded && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              className="text-xs px-3 py-1.5 rounded-full touch-target"
              style={{ backgroundColor: 'rgba(255,179,0,0.12)', color: '#8B7355' }}
            >
              🔍 放大
            </button>
            <button
              type="button"
              onClick={() => void downloadImage(url)}
              className="text-xs px-3 py-1.5 rounded-full touch-target"
              style={{ backgroundColor: 'rgba(255,179,0,0.12)', color: '#8B7355' }}
            >
              💾 保存
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="text-xs px-3 py-1.5 rounded-full touch-target"
              style={{ backgroundColor: 'rgba(255,179,0,0.18)', color: '#6B5344', fontWeight: 600 }}
            >
              📤 分享
            </button>
          </div>
        )}
        {shareHint && (
          <p className="text-xs mt-1" style={{ color: '#16a34a' }}>{shareHint}</p>
        )}
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-6 gap-4"
          onClick={() => setEnlarged(false)}
        >
          <motion.img
            src={url}
            alt={alt}
            className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springGentle}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => void downloadImage(url)}
              className="px-4 py-2 rounded-full bg-white/90 text-sm font-medium"
              style={{ color: '#3A2E2C' }}
            >
              💾 保存到设备
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: '#FFB300' }}
            >
              📤 分享
            </button>
          </div>
          <button
            type="button"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg"
            onClick={() => setEnlarged(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
