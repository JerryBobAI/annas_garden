'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { createClient } from '@/lib/supabase/client'
import type { Creation, CreationPage } from '@/types'
import WordCard from '@/components/child/word-card'
import ShareLinkButton from '@/components/shared/share-link-button'

export default function CreationDetailPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const [creation, setCreation] = useState<Creation | null>(null)
  const [pages, setPages] = useState<CreationPage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/creations/${id}`)
        if (!res.ok) return
        const data = await res.json()
        setCreation(data.creation as Creation)
        setPages((data.pages || []) as CreationPage[])
      } catch (err) {
        console.error('Load creation error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) load()
  }, [id])

  /** 切换收藏 */
  async function toggleFavorite() {
    if (!creation) return
    const newVal = !creation.is_favorite
    await supabase.from('creations').update({ is_favorite: newVal }).eq('id', creation.id)
    setCreation({ ...creation, is_favorite: newVal })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-badge-enter">📖</div>
      </div>
    )
  }

  if (!creation) {
    return (
      <div className="container mx-auto px-4 pt-8 text-center">
        <p className="text-muted-brown">找不到这个创作 😥</p>
        <BackIconLink href="/child/creations" label="返回创作列表" className="mt-4" />
      </div>
    )
  }

  // 提取英语新单词（如果是英语冒险）
  const isEnglish = creation.creation_type === 'english_adventure'
  const englishContent = isEnglish ? (creation.content as { new_words?: string[] }) : null
  const newWords = englishContent?.new_words || []

  return (
    <div className="container mx-auto px-4 pt-6 pb-8">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/child/creations" className="text-2xl touch-target">←</Link>
        <h1 className="text-lg font-bold text-primary-dark flex-1 text-center truncate px-4">
          {creation.cover_emoji} {creation.title}
        </h1>
        <button onClick={toggleFavorite} className="text-2xl touch-target">
          {creation.is_favorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* 封面区 */}
      <div className="card rounded-soft p-6 text-center mb-6 animate-card-enter">
        <div className="text-7xl mb-3">{creation.cover_emoji}</div>
        <h2 className="text-xl font-bold text-primary-dark mb-1">{creation.title}</h2>
        <p className="text-sm text-muted-brown">
          作者：Anna & 花园精灵 ✨
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-brown">
          <span>{pages.length} 页</span>
          <span>{creation.word_count} 字</span>
          <span>
            {creation.status === 'completed' ? '✅ 已完成' : '✏️ 创作中'}
          </span>
        </div>
      </div>

      {/* 页面内容 */}
      {pages.map((page) => (
        <div
          key={page.id}
          className="card rounded-soft p-5 mb-4 animate-card-enter"
        >
          <div className="text-xs text-muted-brown mb-2 text-center">
            ─ ─ ─ ─ 第 {page.page_number} 页 ─ ─ ─ ─
          </div>
          <div className="text-sm text-primary-dark leading-relaxed whitespace-pre-wrap">
            {page.content}
          </div>
          {page.illustration_prompt && (
            <div className="mt-3 px-3 py-2 rounded-lg text-xs text-muted-brown" style={{ background: 'rgba(255,179,0,0.08)' }}>
              🎨 画面描述：{page.illustration_prompt}
            </div>
          )}
          {page.author === 'fairy' && (
            <div className="text-right text-xs text-muted-brown mt-2">— 花园精灵 🧚</div>
          )}
        </div>
      ))}

      {/* 英语新单词收集 */}
      {isEnglish && newWords.length > 0 && (
        <div className="card rounded-soft p-5 mb-4 animate-card-enter">
          <h3 className="text-sm font-semibold text-primary-dark mb-3">⭐ 学到的新单词</h3>
          <div className="flex flex-wrap gap-2">
            {newWords.map((word) => (
              <WordCard key={word} word={word} compact />
            ))}
          </div>
        </div>
      )}

      {/* 知识点标签 */}
      {creation.knowledge_tags && creation.knowledge_tags.length > 0 && (
        <div className="card rounded-soft p-5 mb-4 animate-card-enter">
          <h3 className="text-sm font-semibold text-primary-dark mb-3">📊 知识点</h3>
          <div className="flex flex-wrap gap-2">
            {creation.knowledge_tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,179,0,0.15)', color: '#8B6914' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <button onClick={toggleFavorite} className="btn-primary px-6 py-2 text-white text-sm rounded-full touch-target">
          {creation.is_favorite ? '❤️ 已收藏' : '🤍 收藏'}
        </button>
        {creation.status === 'completed' && (
          <ShareLinkButton
            href={`/share/creation/${creation.id}`}
            title={`${creation.title} · 安娜的花园`}
            text={`看看我在安娜的花园里的创作：${creation.title}`}
            label="🔗 分享给爸爸妈妈"
          />
        )}
        <Link
          href={`/child/chat?mode=create&subject=${creation.subject}`}
          className="px-6 py-2 text-sm rounded-full touch-target border"
          style={{ color: '#8B7355', borderColor: 'rgba(139,115,85,0.3)' }}
        >
          ✏️ 再创作一个
        </Link>
      </div>
    </div>
  )
}
