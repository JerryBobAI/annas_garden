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
            <div className="text-6xl mb-4">🧚</div>
            <h1 className="text-5xl md:text-7xl font-bold warm-text mb-4" style={{ color: '#3A2E2C' }}>
              Anna&apos;s Garden
            </h1>
            <p className="text-xl md:text-2xl" style={{ color: '#5D4E4A' }}>
              和花园精灵一起探索、任务、创造
            </p>
          </div>

          {/* 核心价值 */}
          <div className="grid md:grid-cols-3 gap-6 my-12">
            <div className="p-6 animate-card-enter" style={{ '--stagger': '0ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                AI 对话学习
              </h3>
              <p style={{ color: '#8B7355' }}>
                孩子可以直接向花园精灵提问
              </p>
            </div>
            <div className="p-6 animate-card-enter" style={{ '--stagger': '100ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                情境化任务
              </h3>
              <p style={{ color: '#8B7355' }}>
                把练习题变成有趣的小挑战
              </p>
            </div>
            <div className="p-6 animate-card-enter" style={{ '--stagger': '200ms' } as React.CSSProperties}>
              <div className="text-4xl mb-3">✏️</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                创造模式
              </h3>
              <p style={{ color: '#8B7355' }}>
                一起编故事、做创作、表达想法
              </p>
            </div>
          </div>

          {/* 入口按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/parent"
              className="btn-primary px-8 py-4 text-lg font-semibold text-white rounded-soft touch-target animate-card-enter text-center inline-flex items-center justify-center"
              style={{ '--stagger': '0ms' } as React.CSSProperties}
            >
              🌿 家长入口
            </Link>
            <Link
              href="/child"
              className="glass-card px-8 py-4 text-lg font-semibold rounded-soft touch-target border-soft hover:bg-white/90 transition-all animate-card-enter text-center inline-flex items-center justify-center"
              style={{ '--stagger': '100ms', color: '#3A2E2C' } as React.CSSProperties}
            >
              💬 和精灵聊天
            </Link>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="glass-card rounded-soft p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👨‍👩‍👧 家长侧
            </h3>
            <ul className="space-y-3" style={{ color: '#5D4E4A' }}>
              <li>📊 查看孩子的学习进展和成长数据</li>
              <li>🎯 管理学期目标和学习内容</li>
              <li>🧠 后续接入 AI 学习洞察报告</li>
              <li>🌱 观察对话带来的花园成长</li>
            </ul>
          </div>
          <div className="glass-card rounded-soft p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#3A2E2C' }}>
              👧 孩子端
            </h3>
            <ul className="space-y-3" style={{ color: '#5D4E4A' }}>
              <li>🌿 探索模式：问精灵任何问题</li>
              <li>⚔️ 任务模式：完成情境化练习</li>
              <li>✏️ 创造模式：编故事、做创作</li>
              <li>🌳 花园和成就记录学习成长</li>
            </ul>
          </div>
        </div>

        {/* 学科说明 */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8 warm-text" style={{ color: '#3A2E2C' }}>
            三种学习方式
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">🌿</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                探索
              </h3>
              <p style={{ color: '#8B7355' }}>
                从好奇心出发，自由提问
              </p>
            </div>
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                任务
              </h3>
              <p style={{ color: '#8B7355' }}>
                在故事任务里练习知识点
              </p>
            </div>
            <div className="glass-card rounded-soft p-6">
              <div className="text-4xl mb-3">✏️</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#3A2E2C' }}>
                创造
              </h3>
              <p style={{ color: '#8B7355' }}>
                用表达和想象完成作品
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="mt-20 py-8 text-center" style={{ color: '#8B7355' }}>
        <p>🧚 Anna&apos;s Garden - 让每一次对话都长出新芽</p>
      </footer>
    </main>
  )
}
