'use client'

import Link from 'next/link'

export default function ParentPage() {
  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <div className="glass-card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="px-4 py-2 text-sm rounded-soft glass-card border-soft hover:bg-white/90 transition-all"
              style={{ color: '#3A2E2C' }}
            >
              ← 返回首页
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: '#3A2E2C' }}>
                🌿 家长中心
              </h1>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                管理学习内容，追踪成长进度
              </p>
            </div>
            <div className="w-24" />
          </div>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* 内容管理 */}
          <Link href="/parent/content" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '0ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">📚</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                内容管理
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                录入学习资料，AI 辅助识别，管理题目库
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 手动上传图片/PDF</li>
                <li>✓ AI 智能识别题目</li>
                <li>✓ 接入外部资源</li>
                <li>✓ 组织学习内容</li>
              </ul>
            </div>
          </Link>

          {/* 内容审核 */}
          <Link href="/parent/review" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '50ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                内容审核
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                审核 AI 生成和外部资源，确保内容适合孩子
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 查看待审核队列</li>
                <li>✓ 预览学习内容</li>
                <li>✓ 批准或拒绝</li>
                <li>✓ 编辑调整</li>
              </ul>
            </div>
          </Link>

          {/* 学期目标 */}
          <Link href="/parent/goals" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                学期目标
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                设定学期重点，规划每周学习目标
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 导入教学大纲</li>
                <li>✓ 分解周目标</li>
                <li>✓ 设置优先级</li>
                <li>✓ 关联学习内容</li>
              </ul>
            </div>
          </Link>

          {/* 学习计划 */}
          <Link href="/parent/plans" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '150ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">📅</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                学习计划
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                设置每日/每周学习任务，安排学习节奏
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 设定每日目标</li>
                <li>✓ 安排学习时长</li>
                <li>✓ 分配学科比重</li>
                <li>✓ 调整难度</li>
              </ul>
            </div>
          </Link>

          {/* 数据看板 */}
          <Link href="/parent/dashboard" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                数据看板
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                查看学习数据，了解孩子成长轨迹
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 学习时长统计</li>
                <li>✓ 正确率趋势</li>
                <li>✓ 知识点掌握</li>
                <li>✓ 错题分析</li>
              </ul>
            </div>
          </Link>

          {/* 系统设置 */}
          <Link href="/parent/settings" className="group">
            <div className="glass-card rounded-soft p-8 h-full hover:scale-105 transition-transform cursor-pointer animate-card-enter" style={{ '--stagger': '250ms' } as React.CSSProperties}>
              <div className="text-5xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3A2E2C' }}>
                系统设置
              </h2>
              <p className="mb-4" style={{ color: '#5D4E4A' }}>
                配置外部数据源、AI 参数等
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                <li>✓ 数据源管理</li>
                <li>✓ AI 配置</li>
                <li>✓ 账号设置</li>
                <li>✓ 导入导出</li>
              </ul>
            </div>
          </Link>
        </div>

        {/* 快速统计 */}
        <div className="mt-12 glass-card rounded-soft p-8 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#3A2E2C' }}>
            📈 快速概览
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 animate-card-enter" style={{ '--stagger': '0ms' } as React.CSSProperties}>
              <div className="text-4xl font-bold mb-2" style={{ color: '#FFB300' }}>
                12
              </div>
              <div className="text-sm" style={{ color: '#8B7355' }}>
                本周学习内容
              </div>
            </div>
            <div className="text-center p-4 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
              <div className="text-4xl font-bold mb-2" style={{ color: '#FFB300' }}>
                85%
              </div>
              <div className="text-sm" style={{ color: '#8B7355' }}>
                平均正确率
              </div>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl font-bold mb-2" style={{ color: '#FFB300' }}>
                3.5h
              </div>
              <div className="text-sm" style={{ color: '#8B7355' }}>
                本周学习时长
              </div>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl font-bold mb-2" style={{ color: '#FFB300' }}>
                5
              </div>
              <div className="text-sm" style={{ color: '#8B7355' }}>
                待审核内容
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
