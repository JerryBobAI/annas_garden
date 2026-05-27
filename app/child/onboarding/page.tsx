'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getClientUser } from '@/lib/supabase/client'
import { playTap, playNavigate } from '@/lib/sounds'
import FairyAvatar from '@/components/child/fairy-avatar'
import type { LearningMode } from '@/types'

/**
 * Onboarding 步骤
 * 1. welcome — 精灵出场 + 自我介绍
 * 2. name — 输入昵称
 * 3. seed — 种下第一颗种子动画
 * 4. mode — 选择第一个模式
 * 5. 跳转 first_chat
 */
type Step = 'welcome' | 'name' | 'seed' | 'mode'

const MODE_OPTIONS: { mode: LearningMode; icon: string; title: string; desc: string }[] = [
  { mode: 'explore', icon: '🌿', title: '探索', desc: '问精灵任何问题' },
  { mode: 'quest',   icon: '⚔️', title: '任务', desc: '趣味练习挑战' },
  { mode: 'create',  icon: '✏️', title: '创造', desc: '编故事、做创作' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  // 检查是否已完成 onboarding
  useEffect(() => {
    async function check() {
      const user = await getClientUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data } = await supabase
        .from('cognitive_profiles')
        .select('id')
        .eq('child_id', user.id)
        .single()

      if (data) {
        // 已完成 onboarding，回到首页
        router.replace('/child')
      }
    }
    check()
  }, [supabase, router])

  async function handleNameSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      const user = await getClientUser()
      if (user) {
        await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id)
      }
    } catch (err) {
      console.error('Save name error:', err)
    }
    setSaving(false)
    playNavigate()
    setStep('seed')
  }

  async function handleSeedPlant() {
    setSaving(true)
    try {
      const user = await getClientUser()
      if (user) {
        await supabase.from('garden_plants').insert({
          child_id: user.id,
          plant_type: 'seed',
          name: '好奇种子',
          growth_stage: 0,
        })
      }
    } catch (err) {
      console.error('Plant seed error:', err)
    }
    setSaving(false)
    playTap()
    setStep('mode')
  }

  async function handleModeSelect(mode: LearningMode) {
    setSaving(true)
    try {
      const user = await getClientUser()
      if (user) {
        await supabase.from('cognitive_profiles').insert({
          child_id: user.id,
          preferred_mode: mode,
          attention_span_avg: 600,
          vocabulary_level: 1,
        })
      }
    } catch (err) {
      console.error('Save profile error:', err)
    }
    setSaving(false)
    playNavigate()
    // 跳转到第一次对话
    router.replace(`/child/chat?mode=${mode}`)
  }

  return (
    <div className="min-h-screen watercolor-bg flex flex-col items-center justify-center px-6">
      {/* Step 1: Welcome */}
      {step === 'welcome' && (
        <div className="text-center animate-card-enter">
          <div className="mb-8 animate-badge-enter">
            <FairyAvatar emotion="happy" size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-primary-dark mb-4 animate-text-pop">
            你好呀！👋
          </h1>
          <p className="text-muted-brown mb-2 animate-text-pop-delay">
            我是花园精灵，住在这片神奇的知识花园里
          </p>
          <p className="text-muted-brown mb-8 animate-text-pop-delay">
            我会陪你一起探索、学习、创造有趣的东西！
          </p>
          <button
            onClick={() => {
              playTap()
              setStep('name')
            }}
            className="btn-primary px-8 py-4 text-white font-semibold rounded-soft touch-target text-lg"
          >
            认识你很高兴！✨
          </button>
        </div>
      )}

      {/* Step 2: Name */}
      {step === 'name' && (
        <div className="text-center w-full max-w-sm animate-card-enter">
          <div className="mb-6">
            <FairyAvatar emotion="happy" size="md" />
          </div>
          <h2 className="text-xl font-bold text-primary-dark mb-2">
            你叫什么名字呀？
          </h2>
          <p className="text-muted-brown mb-6 text-sm">
            精灵想知道怎么称呼你
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="输入你的昵称..."
            maxLength={20}
            className="w-full px-5 py-4 rounded-2xl text-center text-lg border-2 focus:outline-none focus:border-amber-400 transition-colors mb-4"
            style={{
              borderColor: 'rgba(58,46,44,0.12)',
              backgroundColor: 'rgba(253,246,227,0.6)',
              color: '#3A2E2C',
            }}
            autoFocus
          />
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setName('小朋友')
                setTimeout(handleNameSubmit, 100)
              }}
              className="px-6 py-3 rounded-full text-sm text-muted-brown border-2 touch-target"
              style={{ borderColor: 'rgba(58,46,44,0.12)' }}
            >
              先跳过
            </button>
            <button
              onClick={handleNameSubmit}
              disabled={!name.trim() || saving}
              className="btn-primary px-8 py-3 text-white font-semibold rounded-full touch-target disabled:opacity-50"
            >
              确定 ✓
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Seed */}
      {step === 'seed' && (
        <div className="text-center animate-card-enter">
          <div className="mb-6">
            <FairyAvatar emotion="cheering" size="md" />
          </div>
          <h2 className="text-xl font-bold text-primary-dark mb-2">
            种下你的第一颗种子！🌱
          </h2>
          <p className="text-muted-brown mb-8 text-sm">
            每次学习都会让花园里的植物生长哦
          </p>
          <div className="text-8xl mb-8 animate-badge-enter">🌱</div>
          <button
            onClick={handleSeedPlant}
            disabled={saving}
            className="btn-primary px-8 py-4 text-white font-semibold rounded-soft touch-target text-lg disabled:opacity-50"
          >
            {saving ? '种下中...' : '种下种子 🪴'}
          </button>
        </div>
      )}

      {/* Step 4: Mode */}
      {step === 'mode' && (
        <div className="text-center w-full max-w-md animate-card-enter">
          <div className="mb-6">
            <FairyAvatar emotion="happy" size="md" />
          </div>
          <h2 className="text-xl font-bold text-primary-dark mb-2">
            先来做什么呢？
          </h2>
          <p className="text-muted-brown mb-6 text-sm">
            选一个你最感兴趣的，以后随时可以切换
          </p>
          <div className="grid gap-4">
            {MODE_OPTIONS.map((opt, idx) => (
              <button
                key={opt.mode}
                onClick={() => handleModeSelect(opt.mode)}
                disabled={saving}
                className="card rounded-soft p-5 flex items-center gap-4 text-left hover:scale-102 transition-transform animate-card-enter disabled:opacity-50"
                style={{ '--stagger': `${idx * 100}ms` } as React.CSSProperties}
              >
                <div className="text-4xl">{opt.icon}</div>
                <div>
                  <div className="font-semibold text-primary-dark">{opt.title}</div>
                  <div className="text-sm text-muted-brown">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
