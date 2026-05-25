'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { playTap } from '@/lib/sounds'
import { fadeInUp, springGentle } from '@/lib/animations'

interface ModeCardProps {
  mode: 'explore' | 'quest' | 'create'
  icon: string                    // emoji
  title: string                   // "探索"
  subtitle: string                // "问精灵" / "今日5题"
  href: string                    // /child/chat?mode=explore
  badge?: string                  // 可选角标，如 "新"
  stagger?: string                // 动画延迟（兼容旧用法，实际由 variants 控制）
}

/**
 * 模式入口卡片
 * 孩子首页的主要交互入口，点击进入对应模式的 AI 对话
 * 使用 framer-motion spring 弹入 + whileTap 按压反馈
 */
export default function ModeCard({
  icon,
  title,
  subtitle,
  href,
  badge,
}: ModeCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={springGentle}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.96 }}
      className="relative"
    >
      {badge && (
        <motion.div
          className="absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: '#FFB300' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.3 }}
        >
          {badge}
        </motion.div>
      )}
      <Link href={href} onClick={() => playTap()} className="block">
        <div className="card rounded-soft p-6 text-center">
          <div className="text-5xl mb-3">{icon}</div>
          <div className="font-semibold mb-1 text-primary-dark">{title}</div>
          <div className="text-xs text-muted-brown">{subtitle}</div>
        </div>
      </Link>
    </motion.div>
  )
}
