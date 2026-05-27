'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '@/lib/animations'

interface ChatImageProps {
  url: string
  alt?: string
  prompt?: string
}

/**
 * 对话中的 AI 生成图片组件
 * 点击可放大查看，带加载动画
 */
export default function ChatImage({ url, alt = 'AI 生成的图片', prompt }: ChatImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [enlarged, setEnlarged] = useState(false)

  return (
    <>
      <motion.div
        className="relative mt-2 mb-1 rounded-xl overflow-hidden cursor-pointer"
        style={{ maxWidth: 280 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springGentle}
        onClick={() => setEnlarged(true)}
      >
        {/* 加载占位 */}
        {!loaded && (
          <div className="w-full aspect-square bg-amber-50 rounded-xl flex items-center justify-center">
            <span className="text-2xl animate-hint-pulse">🎨</span>
            <span className="text-xs text-muted-brown ml-2">精灵正在画画...</span>
          </div>
        )}

        {/* 图片 */}
        <img
          src={url}
          alt={alt}
          className={`w-full rounded-xl shadow-sm transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />

        {/* 提示标签 */}
        {loaded && prompt && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/30 to-transparent px-3 py-2">
            <p className="text-white text-xs truncate">{prompt}</p>
          </div>
        )}
      </motion.div>

      {/* 全屏查看 */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setEnlarged(false)}
        >
          <motion.img
            src={url}
            alt={alt}
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springGentle}
          />
          <button
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
