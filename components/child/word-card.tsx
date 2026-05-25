'use client'

import { speakText, getVoiceSettings } from '@/lib/audio-player'

interface WordCardProps {
  word: string
  emoji?: string
  phonetic?: string
  chinese?: string
  onPronounce?: () => void
  compact?: boolean
}

/**
 * 英语单词卡片
 * 显示单词 + emoji + 发音按钮
 */
export default function WordCard({
  word,
  emoji,
  phonetic,
  chinese,
  onPronounce,
  compact = false,
}: WordCardProps) {
  async function handlePronounce() {
    if (onPronounce) {
      onPronounce()
      return
    }
    // 默认使用 TTS 发音
    const settings = getVoiceSettings()
    await speakText(word, settings)
  }

  if (compact) {
    return (
      <button
        onClick={handlePronounce}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-target"
        style={{ background: 'rgba(255,179,0,0.12)', color: '#8B6914' }}
      >
        {emoji && <span>{emoji}</span>}
        <span>{word}</span>
        <span className="text-xs opacity-60">🔊</span>
      </button>
    )
  }

  return (
    <div
      className="card rounded-soft p-4 text-center inline-block min-w-[120px]"
      style={{ background: 'rgba(255,255,255,0.9)' }}
    >
      {emoji && <div className="text-4xl mb-2">{emoji}</div>}
      <div className="text-lg font-bold text-primary-dark mb-1">{word}</div>
      {phonetic && (
        <div className="text-xs text-muted-brown mb-1">{phonetic}</div>
      )}
      <button
        onClick={handlePronounce}
        className="text-lg touch-target mx-auto"
        title="播放发音"
      >
        🔊
      </button>
      {chinese && (
        <div className="text-sm text-muted-brown mt-1">{chinese}</div>
      )}
    </div>
  )
}
