'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BackIconLink } from '@/components/shared/back-icon-link'
import { createClient } from '@/lib/supabase/client'

// 实时统计数据类型
interface QuickStats {
  weeklyConversations: number
  totalPlants: number
  bloomingPlants: number
  pendingReview: number
  childName: string
}

export default function ParentPage() {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // 判断角色并定位孩子 ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .single()

      let childId = user.id
      let childName = profile?.display_name || '小朋友'

      if (profile?.role === 'parent') {
        const { data: children } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('parent_id', user.id)
          .eq('role', 'child')
          .limit(1)
        if (children?.[0]) {
          childId = children[0].id
          childName = children[0].display_name || '小朋友'
        }
      }

      // 并行查询实时数据
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekStr = weekAgo.toISOString()

      const [convRes, plantRes, bloomRes, reviewRes, reportRes] = await Promise.all([
        // 本周对话数
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', childId)
          .gte('created_at', weekStr),
        // 花园植物总数
        supabase
          .from('garden_plants')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', childId),
        // 开花植物数
        supabase
          .from('garden_plants')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', childId)
          .eq('stage', 'blooming'),
        // 待审核内容数
        supabase
          .from('materials')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        // 最新 AI 报告摘要
        fetch(`/api/reports?child_id=${childId}&type=weekly&limit=1`),
      ])

      setStats({
        weeklyConversations: convRes.count || 0,
        totalPlants: plantRes.count || 0,
        bloomingPlants: bloomRes.count || 0,
        pendingReview: reviewRes.count || 0,
        childName,
      })

      // 解析最新 AI 摘要
      if (reportRes.ok) {
        const reportData = await reportRes.json()
        const reports = reportData.reports || (reportData.id ? [reportData] : [])
        if (reports.length > 0 && reports[0].ai_summary) {
          setAiSummary(reports[0].ai_summary)
        }
      }

      setLoading(false)
    }
    fetchStats()
  }, [])

  // 功能入口配置
  const menuItems = [
    {
      href: '/parent/dashboard',
      emoji: '📊',
      title: 'AI 学习洞察',
      desc: 'AI 生成学习报告，知识掌握趋势分析',
      highlights: ['AI 周报生成', '知识掌握趋势', '个性化学习建议', '兴趣追踪'],
    },
    {
      href: '/parent/content',
      emoji: '📚',
      title: '内容管理',
      desc: '录入学习资料，AI 辅助识别，管理题目库',
      highlights: ['手动录入题目', 'AI 智能识别', '外部资源接入', 'AI 知识点导入'],
    },
    {
      href: '/parent/review',
      emoji: '✅',
      title: '内容审核',
      desc: '审核 AI 生成和外部资源，确保内容适合孩子',
      highlights: ['待审核队列', '预览学习内容', '批准或拒绝', '知识点标签'],
    },
    {
      href: '/parent/goals',
      emoji: '🎯',
      title: '学期目标',
      desc: '设定学期重点，追踪知识图谱掌握进度',
      highlights: ['导入教学大纲', '知识点掌握追踪', '分解周目标', '优先级设定'],
    },
    {
      href: '/parent/plans',
      emoji: '📅',
      title: '学习计划',
      desc: '安排每日/每周学习任务，AI 推荐补充',
      highlights: ['周视图计划', 'AI 推荐任务', '学习时长安排', '完成度追踪'],
    },
    {
      href: '/parent/settings',
      emoji: '⚙️',
      title: '系统设置',
      desc: '认知档案、AI 配置、数据导出',
      highlights: ['认知档案查看', '语音/AI 配置', '学习数据导出', '账号管理'],
    },
  ]

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <div className="card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between">
            <BackIconLink href="/child" label="返回孩子花园" />
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: '#3A2E2C' }}>
                🌿 家长中心
              </h1>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                {stats ? `${stats.childName}的学习管理` : '管理学习内容，追踪成长进度'}
              </p>
            </div>
            <div className="w-10" />
          </div>
        </div>

        {/* AI 快报摘要（如果有） */}
        {aiSummary && (
          <Link href="/parent/dashboard">
            <div className="card rounded-soft p-5 mb-6 animate-card-enter" style={{ borderLeft: '4px solid #FFB300' }}>
              <div className="content-z">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🧠</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-1" style={{ color: '#3A2E2C' }}>AI 本周摘要</div>
                    <p className="text-sm line-clamp-2" style={{ color: '#5D4E4A' }}>{aiSummary}</p>
                    <p className="text-xs mt-2" style={{ color: '#FFB300' }}>点击查看完整报告 →</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* 实时统计 */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { value: stats?.weeklyConversations ?? '-', label: '本周对话', emoji: '💬' },
            { value: stats?.totalPlants ?? '-', label: '花园植物', emoji: '🌱' },
            { value: stats?.bloomingPlants ?? '-', label: '已开花', emoji: '🌸' },
            { value: stats?.pendingReview ?? '-', label: '待审核', emoji: '📋' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="card rounded-soft p-3 text-center animate-card-enter"
              style={{ '--stagger': `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="text-lg mb-1">{item.emoji}</div>
              <div className="text-xl font-bold" style={{ color: loading ? '#ccc' : '#FFB300' }}>
                {loading ? '…' : item.value}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 功能入口网格 */}
        <div className="grid md:grid-cols-2 gap-5 max-w-6xl mx-auto">
          {menuItems.map((item, index) => (
            <Link href={item.href} key={item.href} className="group">
              <div
                className="card rounded-soft p-6 h-full hover:translate-y-[-2px] transition-transform cursor-pointer animate-card-enter"
                style={{ '--stagger': `${index * 60}ms` } as React.CSSProperties}
              >
                <div className="content-z">
                  <div className="text-4xl mb-3">{item.emoji}</div>
                  <h2 className="text-xl font-bold mb-2" style={{ color: '#3A2E2C' }}>
                    {item.title}
                  </h2>
                  <p className="text-sm mb-3" style={{ color: '#5D4E4A' }}>
                    {item.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.highlights.map((h) => (
                      <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,179,0,0.1)', color: '#d97706' }}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
