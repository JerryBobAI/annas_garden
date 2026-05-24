import Link from 'next/link'

interface PageNavProps {
  backHref?: string
  subtitle: string
  title: string
  rightContent?: React.ReactNode
}

export function PageNav({ backHref = '/child', subtitle, title, rightContent }: PageNavProps) {
  return (
    <div className="container mx-auto px-4 pt-8 pb-6">
      <div className="glass-card rounded-soft p-4">
        <div className="flex items-center justify-between">
          <Link href={backHref} className="text-2xl touch-target" aria-label="返回">
            ←
          </Link>
          <div className="text-center">
            <div className="text-sm mb-1 text-muted-brown">{subtitle}</div>
            <div className="text-lg font-semibold text-primary-dark">{title}</div>
          </div>
          <div className="text-xl font-bold text-amber-accent">{rightContent}</div>
        </div>
      </div>
    </div>
  )
}
