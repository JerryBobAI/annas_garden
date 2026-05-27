'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient, getClientUser } from '@/lib/supabase/client'
import ModeCard from '@/components/child/mode-card'
import { FairySecretHomeWrap } from '@/components/child/fairy-secret-home'
import { AccountSecretSwitchWrap } from '@/components/child/account-secret-switch'
import { staggerContainer, fadeInUp, springGentle } from '@/lib/animations'
import type { LearningRecommendation } from '@/types'

/**
 * 时段问候语（复用原有逻辑）
 */
function getGreeting(): { emoji: string; text: string } {
  const hour = new Date().getHours()
  if (hour < 6) return { emoji: '🌙', text: '凌晨好' }
  if (hour < 9) return { emoji: '🌅', text: '早上好' }
  if (hour < 12) return { emoji: '☀️', text: '上午好' }
  if (hour < 14) return { emoji: '🌞', text: '中午好' }
  if (hour < 18) return { emoji: '🌤', text: '下午好' }
  return { emoji: '🌙', text: '晚上好' }
}

/** 学科对应的 emoji 和中文名 */
const SUBJECT_INFO: Record<string, { emoji: string; label: string }> = {
  chinese: { emoji: '📖', label: '语文' },
  math: { emoji: '🔢', label: '数学' },
  english: { emoji: '🔤', label: '英语' },
}

export default function ChildHomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('Anna')
  const [streakDays, setStreakDays] = useState(0)
  const [totalConversations, setTotalConversations] = useState(0)
  const [gardenPlants, setGardenPlants] = useState(0)
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([])

  const greeting = getGreeting()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const user = await getClientUser()
        if (!user || cancelled) return

        // 检查是否需要 Onboarding（cognitive_profiles 不存在）
        const { data: cogProfile } = await supabase
          .from('cognitive_profiles')
          .select('id')
          .eq('child_id', user.id)
          .single()

        if (!cogProfile && !cancelled) {
          router.replace('/child/onboarding')
          return
        }

        // 并行查询所有数据
        const [profileRes, conversationsRes, plantsRes, streakRes] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', user.id).single(),
          supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('child_id', user.id),
          supabase.from('garden_plants').select('id', { count: 'exact', head: true }).eq('child_id', user.id),
          supabase.from('learning_records').select('created_at').order('created_at', { ascending: false }).limit(100),
        ])

        if (cancelled) return

        if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name)
        setTotalConversations(conversationsRes.count || 0)
        setGardenPlants(plantsRes.count || 0)

        // 计算连续学习天数
        if (streakRes.data && streakRes.data.length > 0) {
          const dates = [...new Set(
            (streakRes.data as { created_at: string }[]).map(r => new Date(r.created_at).toDateString())
          )]
          let streak = 0
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          for (let i = 0; i < 365; i++) {
            const checkDate = new Date(todayDate)
            checkDate.setDate(checkDate.getDate() - i)
            if (dates.includes(checkDate.toDateString())) {
              streak++
            } else {
              if (i === 0) continue
              break
            }
          }
          setStreakDays(streak)
        }

        // Phase 4: 获取 AI 推荐
        try {
          const recRes = await fetch('/api/recommendations')
          if (recRes.ok) {
            const recData = await recRes.json()
            if (!cancelled && recData.recommendations) {
              setRecommendations(recData.recommendations)
            }
          }
        } catch {
          // 推荐加载失败不影响主流程
        }
      } catch (error) {
        console.error('Error fetching child data:', error)
      }
    }

    load()
    return () => { cancelled = true }
  }, [supabase, router])

  return (
    <>
      {/* 顶部欢迎区 */}
      <div className="container mx-auto px-4 pt-8 pb-6">
        <div className="card rounded-soft p-6 animate-card-enter">
          <div className="flex items-center justify-between">
            <AccountSecretSwitchWrap accountLabel={displayName}>
              <p className="text-sm mb-1 text-muted-brown">
                {greeting.emoji} {greeting.text}
              </p>
              <h1 className="text-3xl font-bold text-primary-dark">
                {displayName}
              </h1>
            </AccountSecretSwitchWrap>
            <FairySecretHomeWrap className="text-right">
              <div className="text-5xl mb-1">🧚</div>
              <p className="text-xs text-muted-brown">花园精灵</p>
            </FairySecretHomeWrap>
          </div>
        </div>
      </div>

      {/* 模式入口卡片 */}
      <div className="container mx-auto px-4 mb-8">
        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <ModeCard
            mode="explore"
            icon="🌿"
            title="探索"
            subtitle="问精灵任何问题"
            href="/child/chat?mode=explore"
          />
          <ModeCard
            mode="quest"
            icon="⚔️"
            title="任务"
            subtitle="趣味练习挑战"
            href="/child/chat?mode=quest"
          />
          <ModeCard
            mode="create"
            icon="✏️"
            title="创造"
            subtitle="故事·数学·英语"
            href="/child/chat?mode=create&subject=chinese"
          />
          <motion.div
            variants={fadeInUp}
            transition={springGentle}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            <Link href="/child/garden" className="block">
              <div className="card rounded-soft p-6 text-center relative">
                <div className="text-5xl mb-3">🌳</div>
                <div className="font-semibold mb-1 text-primary-dark">花园</div>
                <div className="text-xs text-muted-brown">
                  {gardenPlants > 0 ? `${gardenPlants} 棵植物` : '等你来种植'}
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Phase 4: AI 推荐任务 */}
      {recommendations.length > 0 && (
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-xl font-bold mb-4 text-primary-dark">
            🧚 精灵推荐
          </h2>
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {recommendations.map((rec, i) => {
              const info = SUBJECT_INFO[rec.subject] || { emoji: '📚', label: rec.subject }
              return (
                <motion.div
                  key={`${rec.subject}-${rec.knowledge_point}`}
                  variants={fadeInUp}
                  transition={{ ...springGentle, delay: i * 0.1 }}
                >
                  <Link
                    href={`/child/chat?mode=${rec.suggested_mode}&subject=${rec.subject}&topic=${encodeURIComponent(rec.knowledge_point)}`}
                    className="block"
                  >
                    <div className="card rounded-soft p-4 flex items-center gap-4 hover:translate-y-[-2px] transition-transform">
                      <div className="text-3xl">{info.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary-dark truncate">
                          {rec.knowledge_point}
                        </div>
                        <div className="text-xs text-muted-brown mt-1">
                          {info.label} · 掌握 {rec.current_mastery}% · 约 {rec.estimated_minutes} 分钟
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            backgroundColor: rec.current_mastery < 30 ? 'rgba(239,68,68,0.1)' :
                              rec.current_mastery < 60 ? 'rgba(255,179,0,0.15)' : 'rgba(34,197,94,0.1)',
                            color: rec.current_mastery < 30 ? '#ef4444' :
                              rec.current_mastery < 60 ? '#d97706' : '#16a34a',
                          }}
                        >
                          {rec.current_mastery}%
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}

      {/* 本周统计 */}
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold mb-4 text-primary-dark">
          📊 本周成长
        </h2>
        <div className="card rounded-soft p-6 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold mb-1 text-amber-accent">
                💬 {totalConversations}
              </div>
              <div className="text-xs text-muted-brown">
                对话次数
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1 text-amber-accent">
                🌱 {gardenPlants}
              </div>
              <div className="text-xs text-muted-brown">
                花园植物
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1 text-amber-accent">
                🔥 {streakDays}
              </div>
              <div className="text-xs text-muted-brown">
                连续天数
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
