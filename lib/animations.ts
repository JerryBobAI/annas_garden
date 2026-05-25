/**
 * 全局动画配置
 * 统一管理 framer-motion 的 spring 参数和 variants
 * 后续 Phase 的动画都从这里复用
 */

import type { Transition, Variants } from 'framer-motion'

// ============================================
// Spring 预设（基于物理弹性的动画曲线）
// ============================================

/** 柔和弹入 — 用于卡片、气泡等常规出场 */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 25,
  mass: 0.8,
}

/** 轻快弹跳 — 用于按钮、小元素 */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 17,
  mass: 0.6,
}

/** 缓慢舒展 — 用于页面切换、大区域 */
export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
  mass: 1,
}

/** 极快响应 — 用于精灵情绪切换 */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.5,
}

// ============================================
// 通用 Variants
// ============================================

/** 从下方弹入（卡片、气泡） */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
}

/** 从小到大弹入（按钮、徽章） */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
}

/** 页面水平滑入 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

/** 页面淡入 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// ============================================
// Stagger 容器（父级控制子元素依次出现）
// ============================================

/** stagger 容器 — 子元素按 0.06s 间隔依次出现 */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

/** stagger 容器（慢速）— 子元素按 0.1s 间隔依次出现 */
export const staggerContainerSlow: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

// ============================================
// 精灵情绪动画
// ============================================

/** 精灵情绪切换动画 */
export const emotionSwitch: Variants = {
  hidden: { scale: 0.5, opacity: 0, rotate: -10 },
  visible: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0.5, opacity: 0, rotate: 10 },
}

// ============================================
// 对话气泡特化
// ============================================

/** 精灵消息（从左弹入） */
export const bubbleAssistant: Variants = {
  hidden: { opacity: 0, x: -15, scale: 0.92 },
  visible: { opacity: 1, x: 0, scale: 1 },
}

/** 用户消息（从右弹入） */
export const bubbleUser: Variants = {
  hidden: { opacity: 0, x: 15, scale: 0.92 },
  visible: { opacity: 1, x: 0, scale: 1 },
}

// ============================================
// 工具函数
// ============================================

/** 生成带延迟的 transition（用于手动 stagger） */
export function withDelay(delay: number, transition: Transition = springGentle): Transition {
  return { ...transition, delay }
}
