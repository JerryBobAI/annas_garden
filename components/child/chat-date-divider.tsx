/** 聊天消息之间的日期分割线 */
export default function ChatDateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2" aria-label={label}>
      <div className="flex-1 h-px" style={{ background: 'rgba(58,46,44,0.12)' }} />
      <span className="text-xs font-medium shrink-0" style={{ color: '#8B7355' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(58,46,44,0.12)' }} />
    </div>
  )
}
