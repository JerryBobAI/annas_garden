'use client'

import React from 'react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen watercolor-bg">
      {/* Hero 区域 */}
      <div className="container mx-auto px-4 py-16">
        <div className="glass-card rounded-soft p-12 md:p-16 text-center max-w-4xl mx-auto animate-card-enter">
          {/* Logo 和标题 */}
          <div className="mb-8">
            <div className="text-6xl mb-4">🌻</div>
            <h1 className="text-5xl md:text-7xl font-bold warm-text mb-4" style={{ color: '#3A2E2C' }}>
              Anna's Garden
            </h1>
            <p className="text-xl md:text-2xl" style={{ color: '#5D4E4A' }}>
              安娜的花园 - 快乐学习，健康成长
            </p>
          </div>

          {/* 核心价值 */}
          <div className="grid md:grid-cols-3 gap-6 my-12">
            <div className="p-6 animate-card-enter" style={{ '--stagger': '0ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">📚</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                围绕学期目标
              </h3>
              <p style={{ color: '#8B7355' }}>
                根据一年级下学期重点，科学安排学习内容
              </p>
            </div>
            <div className="p-6 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                治愈学习体验
              </h3>
              <p style={{ color: '#8B7355' }}>
                温暖的视觉风格，让孩子爱上学习
              </p>
            </div>
            <div className="p-6 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                陪伴式成长
              </h3>
              <p style={{ color: '#8B7355' }}>
                家长引导 + 自主探索，智能错题复习
              </p>
            </div>
          </div>

          {/* 入口按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/parent"
              className="btn-primary px-8 py-4 text-lg font-semibold text-white rounded-soft touch-target animate-card-enter"
              style={{ '--stagger': '0ms' } as React.CSSProperties}
            >
              🌿 家长入口
            </Link>
            <Link
              href="/child"
              className="glass-card px-8 py-4 text-lg font-semibold rounded-soft touch-target border-soft hover:bg-white/90 transition-all animate-card-enter"
              style={{ '--stagger': '100ms', color: '#3A2E2C' } as React.CSSProperties}
            >
              🌸 开始学习
            </Link>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="glass-card rounded-soft p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👨‍👩‍👧 家长功能
            </h3>
            <ul className="space-y-3" style={{ color: '#5D4E4A' }}>
              <li>✨ AI 辅助内容录入，上传图片自动识别</li>
              <li>📅 每日/每周学习计划，灵活安排</li>
              <li>🎯 围绕学期目标，科学规划学习路径</li>
              <li>📊 实时追踪学习进度，掌握孩子成长</li>
            </ul>
          </div>
          <div className="glass-card rounded-soft p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👧 孩子体验
            </h3>
            <ul className="space-y-3" style={{ color: '#5D4E4A' }}>
              <li>🌺 温暖治愈的学习界面</li>
              <li>🎮 趣味互动练习，即时反馈</li>
              <li>🏆 个人进度可视化，成就徽章</li>
              <li>🔄 智能错题推荐，针对性复习</li>
            </ul>
          </div>
        </div>

        {/* 学科说明 */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8 warm-text" style={{ color: '#3A2E2C' }}>
            三大学科体系
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">📖</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                语文
              </h3>
              <p style={{ color: '#8B7355' }}>
                拼音、识字、朗读、理解
              </p>
            </div>
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">🔢</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                数学
              </h3>
              <p style={{ color: '#8B7355' }}>
                计算、逻辑、解决问题
              </p>
            </div>
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">🔤</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                英语
              </h3>
              <p style={{ color: '#8B7355' }}>
                歌谣、拼读、绘本、对话
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="mt-20 py-8 text-center" style={{ color: '#8B7355' }}>
        <p>🌻 Anna's Garden - 让学习像花园一样美好</p>
      </footer>
    </main>
  )
}
