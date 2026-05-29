/** 聊天列表日期分割线文案（今天 / 昨天 / 5月28日 周三） */
export function formatChatDateDivider(iso: string): string {
  const date = new Date(iso)
  const today = startOfLocalDay(new Date())
  const msgDay = startOfLocalDay(date)
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86_400_000)

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export function getChatDayKey(iso?: string): string {
  if (!iso) return startOfLocalDay(new Date()).toISOString()
  return startOfLocalDay(new Date(iso)).toISOString()
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
