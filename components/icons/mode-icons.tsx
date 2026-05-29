'use client'

/**
 * 首页模式卡片图标
 * 水彩手绘风，尺寸较大（48px），用于替换卡片中的 emoji
 */

interface ModeIconProps {
  size?: number
  className?: string
}

/** 探索模式 — 放大镜 + 叶子 */
export function IconExplore({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* 放大镜 */}
      <circle cx="20" cy="20" r="10" stroke="#5D4E37" strokeWidth="2.5" fill="rgba(76,175,80,0.08)" />
      <line x1="27" y1="27" x2="38" y2="38" stroke="#5D4E37" strokeWidth="3" strokeLinecap="round" />
      {/* 叶子装饰 */}
      <path
        d="M18 14c3-4 9-3 10 1-4 0-8 1-10-1z"
        fill="rgba(76,175,80,0.3)"
        stroke="#5D4E37"
        strokeWidth="1"
      />
      <line x1="18" y1="14" x2="22" y2="18" stroke="#5D4E37" strokeWidth="0.8" opacity="0.5" />
    </svg>
  )
}

/** 任务模式 — 宝剑/旗帜 */
export function IconQuest({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* 旗杆 */}
      <line x1="14" y1="8" x2="14" y2="40" stroke="#5D4E37" strokeWidth="2.5" strokeLinecap="round" />
      {/* 旗帜 */}
      <path
        d="M14 8c6 2 12-2 20 2v14c-8-4-14 0-20-2V8z"
        fill="rgba(255,179,0,0.25)"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 旗帜上的星星 */}
      <path
        d="M26 15l1.5 3 3.5 0.5-2.5 2.5 0.5 3.5-3-1.5-3 1.5 0.5-3.5-2.5-2.5 3.5-0.5L26 15z"
        fill="#5D4E37"
        opacity="0.3"
      />
    </svg>
  )
}

/** 创造模式 — 画笔 + 纸 */
export function IconCreate({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* 纸张 */}
      <rect x="10" y="8" width="22" height="30" rx="2" fill="rgba(255,255,255,0.6)" stroke="#5D4E37" strokeWidth="2" />
      {/* 纸上的线条 */}
      <line x1="15" y1="16" x2="27" y2="16" stroke="#5D4E37" strokeWidth="1" opacity="0.3" />
      <line x1="15" y1="21" x2="25" y2="21" stroke="#5D4E37" strokeWidth="1" opacity="0.3" />
      <line x1="15" y1="26" x2="23" y2="26" stroke="#5D4E37" strokeWidth="1" opacity="0.3" />
      {/* 画笔 */}
      <rect
        x="30" y="12" width="4" height="26" rx="1.5"
        transform="rotate(20 32 25)"
        fill="rgba(255,179,0,0.3)"
        stroke="#5D4E37"
        strokeWidth="1.5"
      />
      {/* 笔尖 */}
      <path
        d="M36 38l-2 4 1-2 2 0-1-2z"
        fill="#5D4E37"
        opacity="0.6"
        transform="rotate(20 35 39)"
      />
    </svg>
  )
}

/** Landing 品牌 — 向日葵 */
export function IconLogoSunflower({ size = 64, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="rgba(255,179,0,0.12)" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180
        const cx = 32 + Math.sin(angle) * 18
        const cy = 32 - Math.cos(angle) * 18
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="5"
            ry="9"
            fill="rgba(255,179,0,0.35)"
            stroke="#5D4E37"
            strokeWidth="1.2"
            transform={`rotate(${i * 30} ${cx} ${cy})`}
          />
        )
      })}
      <circle cx="32" cy="32" r="9" fill="rgba(255,179,0,0.45)" stroke="#5D4E37" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="4" fill="rgba(139,115,85,0.35)" />
      <path d="M32 52c-2 4-6 6-10 6 2-3 5-5 10-6z" fill="rgba(76,175,80,0.35)" stroke="#5D4E37" strokeWidth="1.2" />
      <path d="M32 52c2 4 6 6 10 6-2-3-5-5-10-6z" fill="rgba(76,175,80,0.25)" stroke="#5D4E37" strokeWidth="1.2" />
    </svg>
  )
}

/** 花园精灵 — 带翅膀的小精灵 */
export function IconFairyPartner({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M8 22c4-6 10-8 16-6 2 6 0 12-4 16-6 2-12 0-12-10z"
        fill="rgba(147,112,219,0.15)"
        stroke="#5D4E37"
        strokeWidth="1.5"
      />
      <path
        d="M40 22c-4-6-10-8-16-6-2 6 0 12 4 16 6 2 12 0 12-10z"
        fill="rgba(255,105,180,0.15)"
        stroke="#5D4E37"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="20" r="7" fill="rgba(255,248,240,0.9)" stroke="#5D4E37" strokeWidth="1.8" />
      <circle cx="21" cy="19" r="1.2" fill="#5D4E37" />
      <circle cx="27" cy="19" r="1.2" fill="#5D4E37" />
      <path d="M22 23c2 2 4 2 6 0" stroke="#5D4E37" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 27v8" stroke="#5D4E37" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 32h8" stroke="#5D4E37" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 家长洞察 — 成长曲线 */
export function IconParentInsight({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="8" y="10" width="32" height="28" rx="3" fill="rgba(255,255,255,0.6)" stroke="#5D4E37" strokeWidth="1.8" />
      <line x1="12" y1="34" x2="36" y2="34" stroke="#5D4E37" strokeWidth="1.2" opacity="0.3" />
      <path
        d="M12 30l8-6 6 4 10-12"
        stroke="#FFB300"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="30" r="2" fill="#5D4E37" />
      <circle cx="20" cy="24" r="2" fill="#5D4E37" />
      <circle cx="26" cy="28" r="2" fill="#5D4E37" />
      <circle cx="36" cy="16" r="2" fill="#5D4E37" />
    </svg>
  )
}

/** 安全守护 — 盾牌 + 锁 */
export function IconSafetyShield({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M24 6l14 5v12c0 10-6 16-14 19-8-3-14-9-14-19V11l14-5z"
        fill="rgba(76,175,80,0.12)"
        stroke="#5D4E37"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="19" y="20" width="10" height="9" rx="2" fill="rgba(255,248,240,0.9)" stroke="#5D4E37" strokeWidth="1.5" />
      <path d="M21 20v-2a3 3 0 016 0v2" stroke="#5D4E37" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="25" r="1.5" fill="#5D4E37" />
    </svg>
  )
}

/** 花园卡片 — 小花园场景 */
export function IconGardenCard({ size = 48, className }: ModeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* 土壤 */}
      <ellipse cx="24" cy="40" rx="18" ry="4" fill="rgba(139,115,85,0.15)" />
      {/* 左边花 */}
      <line x1="14" y1="24" x2="14" y2="38" stroke="#5D4E37" strokeWidth="1.5" />
      <circle cx="14" cy="21" r="4" fill="rgba(255,105,180,0.25)" stroke="#5D4E37" strokeWidth="1.2" />
      <circle cx="14" cy="21" r="1.5" fill="rgba(255,179,0,0.4)" />
      {/* 中间树 */}
      <rect x="22.5" y="28" width="3" height="10" rx="1" fill="rgba(139,115,85,0.3)" />
      <ellipse cx="24" cy="22" rx="8" ry="8" fill="rgba(76,175,80,0.2)" stroke="#5D4E37" strokeWidth="1.5" />
      {/* 右边花 */}
      <line x1="34" y1="26" x2="34" y2="38" stroke="#5D4E37" strokeWidth="1.5" />
      <circle cx="34" cy="23" r="3.5" fill="rgba(147,112,219,0.25)" stroke="#5D4E37" strokeWidth="1.2" />
      <circle cx="34" cy="23" r="1.2" fill="rgba(255,179,0,0.4)" />
      {/* 太阳 */}
      <circle cx="40" cy="8" r="4" fill="rgba(255,179,0,0.2)" stroke="#5D4E37" strokeWidth="1" />
    </svg>
  )
}
