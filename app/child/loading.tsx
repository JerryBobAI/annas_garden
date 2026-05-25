/**
 * 孩子端页面级加载状态
 * Next.js 自动在路由切换时展示
 */
export default function ChildLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-6xl mb-4 animate-badge-enter">🧚</div>
      <p className="text-muted-brown text-lg animate-text-pop">
        花园精灵正在赶来...
      </p>
    </div>
  )
}
