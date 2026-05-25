import Link from 'next/link'

interface BackIconLinkProps {
  href?: string
  /** 供屏幕阅读器使用 */
  label?: string
  className?: string
}

/**
 * 仅图标的后退/返回按钮（与 StickyHeader 左侧样式一致）
 */
export function BackIconLink({
  href = '/child',
  label = '返回',
  className = '',
}: BackIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`text-2xl touch-target flex items-center justify-center w-10 h-10 ${className}`.trim()}
      style={{ color: '#3A2E2C' }}
    >
      ←
    </Link>
  )
}
