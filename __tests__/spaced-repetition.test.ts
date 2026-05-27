/**
 * 艾宾浩斯复习调度引擎 — 单元测试
 */

import {
  calculateStability,
  calculateRetention,
  daysSince,
  getReviewSchedule,
  getReviewPromptInjection,
} from '@/lib/engine/spaced-repetition'
import type { KnowledgeMastery } from '@/types'

// ============================================
// calculateStability
// ============================================

describe('calculateStability', () => {
  it('练习 1 次、掌握度 0 → 基础稳定性', () => {
    const s = calculateStability(1, 0)
    expect(s).toBeCloseTo(1.5, 1)
  })

  it('练习次数越多 → 稳定性越高', () => {
    const s1 = calculateStability(1, 50)
    const s3 = calculateStability(3, 50)
    expect(s3).toBeGreaterThan(s1)
  })

  it('掌握度越高 → 稳定性越高', () => {
    const low = calculateStability(2, 20)
    const high = calculateStability(2, 80)
    expect(high).toBeGreaterThan(low)
  })

  it('练习 0 次不会出错', () => {
    const s = calculateStability(0, 50)
    expect(s).toBeGreaterThan(0)
  })
})

// ============================================
// calculateRetention
// ============================================

describe('calculateRetention', () => {
  it('刚练完（0天）→ 保持率 100%', () => {
    expect(calculateRetention(0, 5)).toBe(1)
  })

  it('时间越长 → 保持率越低', () => {
    const r1 = calculateRetention(1, 3)
    const r7 = calculateRetention(7, 3)
    expect(r7).toBeLessThan(r1)
  })

  it('稳定性越高 → 同样时间保持率越高', () => {
    const lowS = calculateRetention(3, 2)
    const highS = calculateRetention(3, 10)
    expect(highS).toBeGreaterThan(lowS)
  })

  it('结果在 0-1 范围内', () => {
    const r = calculateRetention(100, 1)
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(1)
  })
})

// ============================================
// daysSince
// ============================================

describe('daysSince', () => {
  it('undefined → Infinity', () => {
    expect(daysSince(undefined)).toBe(Infinity)
  })

  it('现在 → 接近 0', () => {
    const now = new Date().toISOString()
    expect(daysSince(now)).toBeLessThan(0.01)
  })

  it('1 天前 → 约 1', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(daysSince(yesterday)).toBeCloseTo(1, 0)
  })
})

// ============================================
// getReviewSchedule
// ============================================

function makeMastery(overrides: Partial<KnowledgeMastery> = {}): KnowledgeMastery {
  return {
    id: 'test-id',
    child_id: 'child-1',
    subject: 'math',
    knowledge_point: '加法',
    mastery_level: 50,
    practice_count: 2,
    last_practiced_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source_conversations: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getReviewSchedule', () => {
  it('空数据 → 空列表', () => {
    const schedule = getReviewSchedule([])
    expect(schedule.items).toHaveLength(0)
    expect(schedule.total_due).toBe(0)
  })

  it('刚练过的不需要复习', () => {
    const schedule = getReviewSchedule([
      makeMastery({ last_practiced_at: new Date().toISOString() }),
    ])
    expect(schedule.items).toHaveLength(0)
  })

  it('7 天前练过、掌握度低 → 需要复习', () => {
    const schedule = getReviewSchedule([
      makeMastery({
        mastery_level: 30,
        practice_count: 1,
        last_practiced_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ])
    expect(schedule.items.length).toBeGreaterThan(0)
    expect(schedule.items[0].knowledge_point).toBe('加法')
  })

  it('掌握度 >= 95 不需要复习', () => {
    const schedule = getReviewSchedule([
      makeMastery({
        mastery_level: 96,
        last_practiced_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ])
    expect(schedule.items).toHaveLength(0)
  })

  it('从未练过不需要复习', () => {
    const schedule = getReviewSchedule([
      makeMastery({ practice_count: 0 }),
    ])
    expect(schedule.items).toHaveLength(0)
  })

  it('按优先级排序（遗忘严重的在前）', () => {
    const schedule = getReviewSchedule([
      makeMastery({
        knowledge_point: '近期练',
        mastery_level: 60,
        practice_count: 3,
        last_practiced_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      makeMastery({
        knowledge_point: '很久没练',
        mastery_level: 20,
        practice_count: 1,
        last_practiced_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ])

    if (schedule.items.length >= 2) {
      expect(schedule.items[0].priority).toBeGreaterThanOrEqual(schedule.items[1].priority)
    }
  })

  it('学科筛选有效', () => {
    const schedule = getReviewSchedule([
      makeMastery({ subject: 'math', knowledge_point: '加法' }),
      makeMastery({ subject: 'chinese', knowledge_point: '拼音' }),
    ], 'math')

    for (const item of schedule.items) {
      expect(item.subject).toBe('math')
    }
  })

  it('最多返回 5 项', () => {
    const data = Array.from({ length: 10 }, (_, i) =>
      makeMastery({
        id: `id-${i}`,
        knowledge_point: `知识点${i}`,
        mastery_level: 20,
        practice_count: 1,
        last_practiced_at: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000).toISOString(),
      })
    )
    const schedule = getReviewSchedule(data)
    expect(schedule.items.length).toBeLessThanOrEqual(5)
    expect(schedule.total_due).toBeGreaterThan(5)
  })

  it('suggestion 不为空', () => {
    const schedule = getReviewSchedule([
      makeMastery({
        practice_count: 1,
        mastery_level: 20,
        last_practiced_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ])
    if (schedule.items.length > 0) {
      expect(schedule.items[0].suggestion).toBeTruthy()
      expect(schedule.items[0].suggestion.length).toBeGreaterThan(5)
    }
  })
})

// ============================================
// getReviewPromptInjection
// ============================================

describe('getReviewPromptInjection', () => {
  it('无复习项 → null', () => {
    expect(getReviewPromptInjection({ items: [], total_due: 0 })).toBeNull()
  })

  it('有复习项 → 包含知识点名称', () => {
    const injection = getReviewPromptInjection({
      items: [
        {
          knowledge_point: '破十法',
          subject: 'math',
          mastery_level: 40,
          retention: 0.3,
          days_since_practice: 5,
          priority: 0.5,
          suggestion: '...',
        },
      ],
      total_due: 1,
    })
    expect(injection).toContain('破十法')
    expect(injection).toContain('复习')
  })
})
