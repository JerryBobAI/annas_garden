import { estimateTokens, truncateHistory, isNearTokenLimit } from '@/lib/ai/token-manager'
import type { Message, MessageRole } from '@/types'

describe('estimateTokens', () => {
  it('中文 token 估算：约每字 2 token', () => {
    const tokens = estimateTokens('你好世界') // 4个中文字
    expect(tokens).toBeGreaterThanOrEqual(6)
    expect(tokens).toBeLessThanOrEqual(12)
  })

  it('英文 token 估算：约每 4 字符 1 token', () => {
    const tokens = estimateTokens('hello world') // 11 chars
    expect(tokens).toBeGreaterThanOrEqual(2)
    expect(tokens).toBeLessThanOrEqual(6)
  })

  it('空字符串返回 0', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('truncateHistory', () => {
  const makeMsg = (content: string, role: MessageRole = 'user'): Message => ({
    id: `msg-${Math.random()}`,
    conversation_id: 'conv-1',
    role,
    content,
    token_count: estimateTokens(content),
    structured_output: undefined,
    created_at: new Date().toISOString(),
  })

  it('短历史不被截断', () => {
    const msgs = [makeMsg('你好'), makeMsg('世界', 'assistant')]
    const result = truncateHistory(msgs, 500)
    expect(result).toHaveLength(2)
  })

  it('最少保留最后 4 条消息', () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg('这是一段很长的文字'.repeat(50), i % 2 === 0 ? 'user' : 'assistant'),
    )
    const result = truncateHistory(msgs, 500)
    expect(result.length).toBeGreaterThanOrEqual(4)
  })
})

describe('isNearTokenLimit', () => {
  const makeMsg = (content: string, role: MessageRole = 'user'): Message => ({
    id: `msg-${Math.random()}`,
    conversation_id: 'conv-1',
    role,
    content,
    token_count: estimateTokens(content),
    structured_output: undefined,
    created_at: new Date().toISOString(),
  })

  it('低 token 数不触发限制', () => {
    const msgs = [makeMsg('你好')]
    expect(isNearTokenLimit(msgs, 100)).toBe(false)
  })

  it('接近限制时返回 true', () => {
    // maxContextTokens = 16000, threshold 0.8 → 12800
    // 创建大量消息使 token 总数超过阈值
    const msgs = Array.from({ length: 100 }, () => makeMsg('这是一段很长的文字'.repeat(20)))
    expect(isNearTokenLimit(msgs, 500)).toBe(true)
  })
})
