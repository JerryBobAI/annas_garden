/**
 * API 入参校验工具 — 单元测试
 */

import {
  generateReportSchema,
  chatMessageSchema,
  gardenEventSchema,
  subjectSchema,
  reportTypeSchema,
  paginationSchema,
} from '@/lib/api/validation'

describe('generateReportSchema', () => {
  it('空 body 应通过（所有字段可选）', () => {
    const result = generateReportSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('有效 type 应通过', () => {
    const result = generateReportSchema.safeParse({ type: 'weekly' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.type).toBe('weekly')
  })

  it('无效 type 应失败', () => {
    const result = generateReportSchema.safeParse({ type: 'daily' })
    expect(result.success).toBe(false)
  })

  it('完整参数应通过', () => {
    const result = generateReportSchema.safeParse({
      child_id: 'abc-123',
      type: 'monthly',
      period_start: '2026-05-01',
      period_end: '2026-05-31',
    })
    expect(result.success).toBe(true)
  })
})

describe('chatMessageSchema', () => {
  it('有效消息应通过', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'user', content: '你好' }],
      mode: 'explore',
    })
    expect(result.success).toBe(true)
  })

  it('空消息数组应失败', () => {
    const result = chatMessageSchema.safeParse({ messages: [] })
    expect(result.success).toBe(false)
  })

  it('空内容应失败', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'user', content: '' }],
    })
    expect(result.success).toBe(false)
  })

  it('无效 role 应失败', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'admin', content: 'hi' }],
    })
    expect(result.success).toBe(false)
  })

  it('无效 mode 应失败', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'user', content: 'hi' }],
      mode: 'battle',
    })
    expect(result.success).toBe(false)
  })
})

describe('gardenEventSchema', () => {
  it('有效事件应通过', () => {
    const result = gardenEventSchema.safeParse({
      child_id: 'child-1',
      action: 'plant',
      subject: 'math',
    })
    expect(result.success).toBe(true)
  })

  it('缺少 child_id 应失败', () => {
    const result = gardenEventSchema.safeParse({ action: 'water' })
    expect(result.success).toBe(false)
  })

  it('无效 action 应失败', () => {
    const result = gardenEventSchema.safeParse({
      child_id: 'x',
      action: 'destroy',
    })
    expect(result.success).toBe(false)
  })
})

describe('subjectSchema', () => {
  it.each(['chinese', 'math', 'english'])('%s 应通过', (s) => {
    expect(subjectSchema.safeParse(s).success).toBe(true)
  })

  it('science 应失败', () => {
    expect(subjectSchema.safeParse('science').success).toBe(false)
  })
})

describe('reportTypeSchema', () => {
  it('weekly 应通过', () => {
    expect(reportTypeSchema.safeParse('weekly').success).toBe(true)
  })

  it('monthly 应通过', () => {
    expect(reportTypeSchema.safeParse('monthly').success).toBe(true)
  })

  it('daily 应失败', () => {
    expect(reportTypeSchema.safeParse('daily').success).toBe(false)
  })
})

describe('paginationSchema', () => {
  it('默认值应生效', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
    }
  })

  it('字符串数字应自动转换', () => {
    const result = paginationSchema.safeParse({ limit: '50', offset: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.offset).toBe(10)
    }
  })

  it('limit 超过 100 应失败', () => {
    const result = paginationSchema.safeParse({ limit: '200' })
    expect(result.success).toBe(false)
  })

  it('负数 offset 应失败', () => {
    const result = paginationSchema.safeParse({ offset: '-1' })
    expect(result.success).toBe(false)
  })
})
