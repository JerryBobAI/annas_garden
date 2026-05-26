/**
 * 认知档案更新器测试
 */

import {
  calculatePreferredMode,
  calculateAttentionSpan,
  getTopInterests,
  computeProfileUpdate,
} from '@/lib/engine/cognitive-updater'

describe('calculatePreferredMode', () => {
  it('应返回出现最多的模式', () => {
    expect(calculatePreferredMode(['explore', 'quest', 'explore', 'create', 'explore']))
      .toBe('explore')
  })

  it('空数组应返回 explore', () => {
    expect(calculatePreferredMode([])).toBe('explore')
  })

  it('单个模式应返回该模式', () => {
    expect(calculatePreferredMode(['quest'])).toBe('quest')
  })
})

describe('calculateAttentionSpan', () => {
  it('首次应返回当前值', () => {
    expect(calculateAttentionSpan(0, 300)).toBe(300)
  })

  it('应使用 EMA 平滑', () => {
    // old * 0.8 + new * 0.2 = 300 * 0.8 + 600 * 0.2 = 240 + 120 = 360
    expect(calculateAttentionSpan(300, 600)).toBe(360)
  })

  it('新值应有一定权重', () => {
    const result = calculateAttentionSpan(300, 100)
    // 300 * 0.8 + 100 * 0.2 = 240 + 20 = 260
    expect(result).toBe(260)
  })
})

describe('getTopInterests', () => {
  it('应返回频率最高的标签', () => {
    const tags = ['加法', '减法', '加法', '识字', '加法', '减法']
    const result = getTopInterests(tags, 2)
    expect(result).toEqual(['加法', '减法'])
  })

  it('空数组应返回空', () => {
    expect(getTopInterests([])).toEqual([])
  })

  it('应限制返回数量', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'a', 'b', 'c', 'd', 'e', 'a']
    expect(getTopInterests(tags, 3).length).toBe(3)
  })
})

describe('computeProfileUpdate', () => {
  it('应正确计算所有字段', () => {
    const currentProfile = {
      attention_span_avg: 300,
      total_conversations: 10,
      total_messages: 50,
    }

    const conversationData = {
      mode: 'explore' as const,
      duration: 600,
      messageCount: 8,
      knowledgeTags: ['加法'],
    }

    const recentModes = ['explore', 'explore', 'quest'] as Array<'explore' | 'quest' | 'create'>
    const recentTags = ['加法', '减法', '加法', '识字']

    const result = computeProfileUpdate(currentProfile, conversationData, recentModes, recentTags)

    expect(result.preferred_mode).toBe('explore')
    expect(result.attention_span_avg).toBe(360) // EMA
    expect(result.total_conversations).toBe(11)
    expect(result.total_messages).toBe(58)
    expect(result.interests).toContain('加法')
  })
})
