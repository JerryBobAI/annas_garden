import { formatChatDateDivider, getChatDayKey } from '@/lib/chat-date-label'

describe('chat-date-label', () => {
  it('labels today and yesterday', () => {
    const now = new Date()
    expect(formatChatDateDivider(now.toISOString())).toBe('今天')

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatChatDateDivider(yesterday.toISOString())).toBe('昨天')
  })

  it('groups messages by local day key', () => {
    const morning = new Date()
    morning.setHours(10, 0, 0, 0)
    const evening = new Date(morning)
    evening.setHours(22, 0, 0, 0)
    expect(getChatDayKey(morning.toISOString())).toBe(getChatDayKey(evening.toISOString()))
  })
})
