'use client'

import { FairyEmotion } from '@/types'

interface FairyFaceSVGProps {
  emotion: FairyEmotion
  size: number
}

/**
 * 精灵矢量角色面部
 * 根据情绪状态渲染不同的眼睛、嘴巴、腮红、装饰
 * 纯 SVG + CSS animation，零外部依赖
 */
export default function FairyFaceSVG({ emotion, size }: FairyFaceSVGProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className="fairy-face"
    >
      {/* 头部底色 — 温暖的杏黄色 */}
      <circle cx="50" cy="50" r="44" fill="#FFF3E0" stroke="#FFE0B2" strokeWidth="2" />

      {/* 腮红 */}
      <circle cx="28" cy="58" r="7" fill="#FFCDD2" opacity="0.5" className="fairy-blush" />
      <circle cx="72" cy="58" r="7" fill="#FFCDD2" opacity="0.5" className="fairy-blush" />

      {/* 精灵叶子装饰（头顶） */}
      <g className="fairy-leaf">
        <ellipse cx="50" cy="12" rx="6" ry="10" fill="#81C784" transform="rotate(-15 50 12)" />
        <ellipse cx="55" cy="10" rx="5" ry="8" fill="#A5D6A7" transform="rotate(20 55 10)" />
        <circle cx="50" cy="18" r="2.5" fill="#66BB6A" />
      </g>

      {/* 眼睛 — 根据情绪变化 */}
      <Eyes emotion={emotion} />

      {/* 嘴巴 — 根据情绪变化 */}
      <Mouth emotion={emotion} />

      {/* 特殊装饰（欢呼模式的星星） */}
      {emotion === 'cheering' && <Sparkles />}
    </svg>
  )
}

function Eyes({ emotion }: { emotion: FairyEmotion }) {
  switch (emotion) {
    case 'happy':
      // 开心的弯弯眼
      return (
        <g className="fairy-eyes">
          <path d="M32 46 Q36 40 40 46" fill="none" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 46 Q64 40 68 46" fill="none" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'thinking':
      // 思考的一大一小眼
      return (
        <g className="fairy-eyes">
          <circle cx="36" cy="44" r="4" fill="#5D4037" />
          <circle cx="64" cy="44" r="3" fill="#5D4037" />
          <circle cx="37.5" cy="43" r="1.2" fill="white" />
          <circle cx="65" cy="43" r="1" fill="white" />
        </g>
      )
    case 'surprised':
      // 惊讶的大圆眼
      return (
        <g className="fairy-eyes">
          <circle cx="36" cy="44" r="5" fill="#5D4037" />
          <circle cx="64" cy="44" r="5" fill="#5D4037" />
          <circle cx="38" cy="42" r="2" fill="white" />
          <circle cx="66" cy="42" r="2" fill="white" />
        </g>
      )
    case 'cheering':
      // 欢呼的星星眼
      return (
        <g className="fairy-eyes">
          <text x="31" y="48" fontSize="10" textAnchor="middle">⭐</text>
          <text x="69" y="48" fontSize="10" textAnchor="middle">⭐</text>
        </g>
      )
  }
}

function Mouth({ emotion }: { emotion: FairyEmotion }) {
  switch (emotion) {
    case 'happy':
      return (
        <path d="M40 62 Q50 70 60 62" fill="none" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
      )
    case 'thinking':
      // 思考的小圆嘴
      return (
        <ellipse cx="50" cy="64" rx="4" ry="3" fill="#5D4037" opacity="0.7" />
      )
    case 'surprised':
      // 惊讶的 O 嘴
      return (
        <ellipse cx="50" cy="64" rx="6" ry="7" fill="#5D4037" opacity="0.8" />
      )
    case 'cheering':
      // 大笑嘴
      return (
        <g>
          <path d="M38 60 Q50 74 62 60" fill="#FFAB91" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M42 60 Q50 53 58 60" fill="none" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )
  }
}

function Sparkles() {
  return (
    <g className="fairy-sparkles">
      <text x="18" y="28" fontSize="8" className="sparkle-1">✨</text>
      <text x="78" y="25" fontSize="7" className="sparkle-2">✨</text>
      <text x="82" y="70" fontSize="6" className="sparkle-3">⭐</text>
    </g>
  )
}
