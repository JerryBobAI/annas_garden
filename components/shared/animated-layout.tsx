'use client'

/**
 * 页面切换动画容器
 * 包裹在页面内容外层，提供统一的入场/离场动画
 */

import { motion } from 'framer-motion'
import { springSmooth, fadeInUp } from '@/lib/animations'

interface AnimatedLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function AnimatedLayout({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={springSmooth}
      className={className}
    >
      {children}
    </motion.div>
  )
}
