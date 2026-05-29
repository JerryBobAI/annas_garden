'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type RefObject,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node
    }
    node = node.parentElement
  }
  return null
}

function useClickOutside(
  isOpen: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      onClose()
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onClose, containerRef])
}

function SaveIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <rect
        x="6"
        y="1.5"
        width="4"
        height="3.5"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M8 7v4.5M5.5 10L8 12.5 10.5 10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15" />
      <line x1="5.8" y1="9" x2="10.2" y2="11.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5.8" y1="7" x2="10.2" y2="4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function InfoButton({
  expanded,
  onToggle,
  compact = false,
}: {
  expanded: boolean
  onToggle: () => void
  compact?: boolean
}) {
  const dot = compact ? 16 : 18
  return (
    <button
      type="button"
      aria-label={expanded ? '隐藏提示词' : '查看提示词'}
      aria-expanded={expanded}
      className="flex items-center justify-center touch-target rounded-full"
      style={{ background: 'transparent' }}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span
        className="rounded-full flex items-center justify-center font-serif italic leading-none"
        style={{
          width: dot,
          height: dot,
          fontSize: compact ? 9 : 10,
          backgroundColor: expanded ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
          color: '#6B5344',
          boxShadow: '0 1px 3px rgba(58,46,44,0.12)',
        }}
      >
        i
      </span>
    </button>
  )
}

function PromptPopover({ prompt }: { prompt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute top-10 right-2 left-2 z-10 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg pointer-events-auto"
      style={{ backgroundColor: 'rgba(255,255,255,0.96)', color: '#5D4E37' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p>{prompt}</p>
    </motion.div>
  )
}

function ActionButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium touch-target shadow-sm"
      style={{ color: '#3A2E2C', backgroundColor: 'rgba(255,255,255,0.9)' }}
      whileHover={{
        scale: 1.05,
        backgroundColor: 'rgba(255,255,255,1)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function ImageToast({ message }: { message: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 8, x: '-50%' }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-10 left-1/2 z-[60] px-4 py-2.5 rounded-full text-sm text-white shadow-lg pointer-events-none"
      style={{ backgroundColor: 'rgba(58,46,44,0.92)' }}
    >
      {message}
    </motion.div>
  )
}

/**
 * 对话中的 AI 生成图片：点击放大，全屏内保存 / 分享
 */
export default function ChatImage({ url, alt = '精灵画的图', prompt }: ChatImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const thumbPromptRef = useRef<HTMLDivElement>(null)
  const enlargedPromptRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [enlarged, setEnlarged] = useState(false)
  const [showThumbPrompt, setShowThumbPrompt] = useState(false)
  const [showEnlargedPrompt, setShowEnlargedPrompt] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeThumbPrompt = useCallback(() => setShowThumbPrompt(false), [])
  const closeEnlargedPrompt = useCallback(() => setShowEnlargedPrompt(false), [])

  useClickOutside(showThumbPrompt, closeThumbPrompt, thumbPromptRef)
  useClickOutside(showEnlargedPrompt, closeEnlargedPrompt, enlargedPromptRef)

  useEffect(() => {
    setLoaded(false)
    setShowThumbPrompt(false)
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [url])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!enlarged) return

    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY
    const scrollParent = getScrollParent(imgRef.current)

    const prevBodyOverflow = body.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyWidth = body.style.width
    const prevHtmlOverflow = html.style.overflow
    const prevScrollParentOverflow = scrollParent?.style.overflow ?? ''
    const prevScrollParentOverscroll = scrollParent?.style.overscrollBehavior ?? ''
    const prevScrollParentTouchAction = scrollParent?.style.touchAction ?? ''

    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    if (scrollParent) {
      scrollParent.style.overflow = 'hidden'
      scrollParent.style.overscrollBehavior = 'none'
      scrollParent.style.touchAction = 'none'
    }

    return () => {
      body.style.overflow = prevBodyOverflow
      body.style.position = prevBodyPosition
      body.style.top = prevBodyTop
      body.style.width = prevBodyWidth
      html.style.overflow = prevHtmlOverflow
      if (scrollParent) {
        scrollParent.style.overflow = prevScrollParentOverflow
        scrollParent.style.overscrollBehavior = prevScrollParentOverscroll
        scrollParent.style.touchAction = prevScrollParentTouchAction
      }
      window.scrollTo(0, scrollY)
    }
  }, [enlarged])

  useEffect(() => {
    if (!enlarged) return

    const overlay = overlayRef.current
    if (!overlay) return

    function blockTouchMove(e: TouchEvent) {
      e.preventDefault()
    }

    overlay.addEventListener('touchmove', blockTouchMove, { passive: false })
    return () => overlay.removeEventListener('touchmove', blockTouchMove)
  }, [enlarged])

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }

  function openEnlarged() {
    setShowThumbPrompt(false)
    setShowEnlargedPrompt(false)
    setEnlarged(true)
  }

  function closeEnlarged() {
    setEnlarged(false)
    setShowEnlargedPrompt(false)
  }

  async function handleSave() {
    try {
      await downloadImage(url)
      showToast('已保存到设备')
    } catch {
      showToast('保存失败，请重试')
    }
  }

  async function handleShare() {
    const result = await shareImage(url, '安娜的花园 · 精灵作品')
    if (result === 'copied') showToast('链接已复制')
    else if (result) showToast('已唤起分享')
    else showToast('请用「保存」后从相册分享')
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
          onClick={openEnlarged}
          role="button"
          tabIndex={0}
          aria-label="放大查看图片"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openEnlarged()
            }
          }}
        >
          {!loaded && (
            <div className="w-full aspect-square bg-amber-50 rounded-xl flex items-center justify-center">
              <span className="text-2xl animate-hint-pulse">🎨</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt={alt}
            className={`w-full rounded-xl border block ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            style={{ borderColor: 'rgba(58,46,44,0.12)' }}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
          {loaded && prompt && (
            <div ref={thumbPromptRef} className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute top-1 right-1 pointer-events-auto">
                <InfoButton
                  compact
                  expanded={showThumbPrompt}
                  onToggle={() => setShowThumbPrompt((v) => !v)}
                />
              </div>
              <AnimatePresence>
                {showThumbPrompt && <PromptPopover prompt={prompt} />}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {enlarged && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="放大查看图片"
          className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-6 gap-4 overscroll-none"
          style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
          onClick={closeEnlarged}
        >
          <div className="relative max-w-full max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <motion.img
              src={url}
              alt={alt}
              className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl block"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springGentle}
            />
            {prompt && (
              <div ref={enlargedPromptRef} className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-2 right-2 pointer-events-auto">
                  <InfoButton
                    expanded={showEnlargedPrompt}
                    onToggle={() => setShowEnlargedPrompt((v) => !v)}
                  />
                </div>
                <AnimatePresence>
                  {showEnlargedPrompt && <PromptPopover prompt={prompt} />}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <ActionButton onClick={() => void handleSave()} icon={<SaveIcon />}>
              保存
            </ActionButton>
            <ActionButton onClick={() => void handleShare()} icon={<ShareIcon />}>
              分享
            </ActionButton>
          </div>
          <motion.button
            type="button"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg touch-target shadow-sm"
            onClick={closeEnlarged}
            aria-label="关闭"
            whileHover={{ scale: 1.06, backgroundColor: 'rgba(255,255,255,0.95)' }}
            whileTap={{ scale: 0.92 }}
          >
            ✕
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {toast && enlarged && <ImageToast message={toast} />}
      </AnimatePresence>
    </>
  )
}
