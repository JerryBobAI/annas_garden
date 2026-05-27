'use client'

/**
 * 手绘水彩风导航图标
 * 和花园精灵风格统一，取代底部导航和头部 tab 的 emoji
 * 颜色跟随 active 状态变化
 */

interface IconProps {
  size?: number
  active?: boolean
  className?: string
}

/** 模式 tab 图标 props（支持自定义颜色） */
interface TabIconProps {
  size?: number
  color?: string
  className?: string
}

const activeColor = '#3A2E2C'
const inactiveColor = '#8B7355'

/* ========================
   模式 tab 小图标（14px，内联在文字前）
   ======================== */

/** 探索 tab — 小放大镜（和首页统一） */
export function TabExplore({ size = 14, color = 'currentColor', className }: TabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="4" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.08" />
      <line x1="9.5" y1="9.5" x2="14" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 任务 tab — 小旗帜（和首页统一） */
export function TabQuest({ size = 14, color = 'currentColor', className }: TabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="3" y1="2" x2="3" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 2c3 1 6-1 9 1v6c-3-2-6 0-9-1z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1" />
    </svg>
  )
}

/** 创造 tab — 小画笔+纸（和首页统一） */
export function TabCreate({ size = 14, color = 'currentColor', className }: TabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="8" height="12" rx="1" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.2" />
      <line x1="4" y1="4" x2="8" y2="4" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <line x1="4" y1="6.5" x2="7" y2="6.5" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <path d="M11 3l2 2-5 5H6V8l5-5z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
    </svg>
  )
}

/** 首页 — 小房子 */
export function IconHome({ size = 24, active = false, className }: IconProps) {
  const color = active ? activeColor : inactiveColor
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      {/* 屋顶 */}
      <path
        d="M16 4L4 15h4v12h16V15h4L16 4z"
        fill={active ? 'rgba(255,179,0,0.15)' : 'transparent'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 门 */}
      <rect x="13" y="19" width="6" height="8" rx="1" fill={color} opacity="0.3" />
      {/* 窗户 */}
      <rect x="10" y="16" width="4" height="3" rx="0.5" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <rect x="18" y="16" width="4" height="3" rx="0.5" stroke={color} strokeWidth="1.2" opacity="0.6" />
      {/* 烟囱 */}
      <rect x="21" y="7" width="3" height="6" rx="0.5" stroke={color} strokeWidth="1.2" opacity="0.5" />
    </svg>
  )
}

/** 学习 — 对话气泡 */
export function IconChat({ size = 24, active = false, className }: IconProps) {
  const color = active ? activeColor : inactiveColor
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M6 8a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H13l-5 4v-4H9a3 3 0 01-3-3V8z"
        fill={active ? 'rgba(255,179,0,0.15)' : 'transparent'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 三个小点 */}
      <circle cx="12" cy="13" r="1.2" fill={color} opacity="0.6" />
      <circle cx="16" cy="13" r="1.2" fill={color} opacity="0.6" />
      <circle cx="20" cy="13" r="1.2" fill={color} opacity="0.6" />
    </svg>
  )
}

/** 花园 — 小花园场景（和首页卡片统一） */
export function IconGarden({ size = 24, active = false, className }: IconProps) {
  const color = active ? activeColor : inactiveColor
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      {/* 土壤 */}
      <ellipse cx="16" cy="27" rx="12" ry="2.5" fill={color} opacity="0.1" />
      {/* 左边花 */}
      <line x1="9" y1="16" x2="9" y2="26" stroke={color} strokeWidth="1.2" />
      <circle cx="9" cy="14" r="2.5" fill={active ? 'rgba(255,105,180,0.25)' : 'rgba(255,105,180,0.1)'} stroke={color} strokeWidth="1" />
      <circle cx="9" cy="14" r="1" fill={active ? 'rgba(255,179,0,0.4)' : 'rgba(255,179,0,0.2)'} />
      {/* 中间树 */}
      <rect x="14.5" y="19" width="3" height="7" rx="1" fill={color} opacity="0.2" />
      <ellipse cx="16" cy="14" rx="6" ry="6" fill={active ? 'rgba(76,175,80,0.2)' : 'rgba(76,175,80,0.1)'} stroke={color} strokeWidth="1.2" />
      {/* 右边花 */}
      <line x1="23" y1="18" x2="23" y2="26" stroke={color} strokeWidth="1.2" />
      <circle cx="23" cy="16" r="2" fill={active ? 'rgba(147,112,219,0.25)' : 'rgba(147,112,219,0.1)'} stroke={color} strokeWidth="1" />
      <circle cx="23" cy="16" r="0.8" fill={active ? 'rgba(255,179,0,0.4)' : 'rgba(255,179,0,0.2)'} />
      {/* 太阳 */}
      <circle cx="27" cy="5" r="2.5" fill={active ? 'rgba(255,179,0,0.25)' : 'rgba(255,179,0,0.1)'} stroke={color} strokeWidth="0.8" />
    </svg>
  )
}

/** 成就 — 星星 */
export function IconStar({ size = 24, active = false, className }: IconProps) {
  const color = active ? activeColor : inactiveColor
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 4l3.5 7.5L28 13l-6 5.5 1.5 8.5-7.5-4-7.5 4 1.5-8.5-6-5.5 8.5-1.5L16 4z"
        fill={active ? 'rgba(255,179,0,0.25)' : 'rgba(255,179,0,0.1)'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 闪光 */}
      {active && (
        <>
          <line x1="16" y1="1" x2="16" y2="3" stroke={color} strokeWidth="1" opacity="0.4" />
          <line x1="28" y1="8" x2="26" y2="9" stroke={color} strokeWidth="1" opacity="0.4" />
          <line x1="4" y1="8" x2="6" y2="9" stroke={color} strokeWidth="1" opacity="0.4" />
        </>
      )}
    </svg>
  )
}
