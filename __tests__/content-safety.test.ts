import {
  isBlockedInput,
  sanitizeAssistantOutput,
  SAFETY_FALLBACK_REPLY,
  SAFETY_INPUT_REJECT,
} from '@/lib/ai/content-safety'

describe('content-safety', () => {
  it('blocks sensitive input patterns', () => {
    expect(isBlockedInput('我的手机号是13800138000')).toBe(true)
    expect(isBlockedInput('为什么天是蓝的？')).toBe(false)
  })

  it('sanitizes unsafe assistant output', () => {
    expect(sanitizeAssistantOutput('我是 AI 大语言模型')).toBe(SAFETY_FALLBACK_REPLY)
    expect(sanitizeAssistantOutput('蜗牛背上有壳保护自己 🐌')).toBe('蜗牛背上有壳保护自己 🐌')
  })

  it('exports friendly reject messages', () => {
    expect(SAFETY_INPUT_REJECT).toContain('精灵')
  })
})
