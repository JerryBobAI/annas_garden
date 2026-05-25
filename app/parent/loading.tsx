/**
 * 家长端页面级加载状态
 * Next.js 自动在路由切换时展示
 */
export default function ParentLoading() {
  return (
    <div className="min-h-screen watercolor-bg flex items-center justify-center">
      <p className="text-muted-brown text-lg">加载中...</p>
    </div>
  )
}
