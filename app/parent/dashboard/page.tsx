/**
 * 家长学习报告面板 — Server Component
 *
 * 数据在服务端预取，无需等待客户端加载
 * 交互逻辑委托给 DashboardClient 组件
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/parent/dashboard-client'
import type { KnowledgeMasteryItem } from '@/components/parent/dashboard-client'
import type { LearningReport } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // 1. 单账号模型：childId 就是当前用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const childId = user.id
  const childName = profile?.display_name || '小朋友'

  // 2. 并行预取所有数据
  const [reportRes, masteryRes, convRes, plantRes] = await Promise.all([
    supabase
      .from('learning_reports')
      .select('*')
      .eq('child_id', childId)
      .eq('report_type', 'weekly')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('knowledge_mastery')
      .select('subject, knowledge_point, mastery_level')
      .eq('child_id', childId)
      .order('mastery_level', { ascending: false })
      .limit(20),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId),
    supabase
      .from('garden_plants')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId),
  ])

  const initialReport: LearningReport | null = reportRes.data?.[0] ?? null
  const masteryItems: KnowledgeMasteryItem[] = (masteryRes.data || []) as KnowledgeMasteryItem[]
  const totalConversations = convRes.count || 0
  const gardenPlants = plantRes.count || 0

  return (
    <DashboardClient
      childId={childId}
      childName={childName}
      initialReport={initialReport}
      masteryItems={masteryItems}
      totalConversations={totalConversations}
      gardenPlants={gardenPlants}
    />
  )
}
