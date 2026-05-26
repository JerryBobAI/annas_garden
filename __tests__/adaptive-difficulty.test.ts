/**
 * 自适应难度系统测试
 */

import {
  calculateDifficultyAdjustment,
  countTrailingTrue,
  countTrailingFalse,
  inferDifficultyFromMastery,
  DEFAULT_DIFFICULTY_CONFIG,
} from '@/lib/engine/adaptive-difficulty'

describe('countTrailingTrue / countTrailingFalse', () => {
  it('计算末尾连续 true', () => {
    expect(countTrailingTrue([false, true, true, true])).toBe(3)
    expect(countTrailingTrue([true, true])).toBe(2)
    expect(countTrailingTrue([true, false])).toBe(0)
    expect(countTrailingTrue([])).toBe(0)
  })

  it('计算末尾连续 false', () => {
    expect(countTrailingFalse([true, false, false])).toBe(2)
    expect(countTrailingFalse([false, false])).toBe(2)
    expect(countTrailingFalse([false, true])).toBe(0)
    expect(countTrailingFalse([])).toBe(0)
  })
})

describe('calculateDifficultyAdjustment', () => {
  it('连续答对 3 次应升级', () => {
    const result = calculateDifficultyAdjustment(2, [true, true, true])
    expect(result).not.toBeNull()
    expect(result!.newDifficulty).toBe(3)
    expect(result!.reason).toContain('correct_streak')
  })

  it('连续答错 2 次应降级', () => {
    const result = calculateDifficultyAdjustment(3, [false, false])
    expect(result).not.toBeNull()
    expect(result!.newDifficulty).toBe(2)
    expect(result!.reason).toContain('wrong_streak')
    expect(result!.encouragement).toBeDefined()
  })

  it('已在最高难度不应再升', () => {
    const result = calculateDifficultyAdjustment(5, [true, true, true])
    expect(result).toBeNull() // 已在最高难度 5，无法升级
  })

  it('已在最低难度仍答错应给特殊鼓励', () => {
    const result = calculateDifficultyAdjustment(1, [false, false])
    expect(result).not.toBeNull()
    expect(result!.newDifficulty).toBe(1) // 保持最低
    expect(result!.reason).toContain('at_min')
    expect(result!.encouragement).toContain('一步一步')
  })

  it('不满足条件不应调整', () => {
    // 只答对 2 次，不满足 3 次条件
    const result = calculateDifficultyAdjustment(3, [true, true])
    expect(result).toBeNull()
  })

  it('空结果数组不应调整', () => {
    const result = calculateDifficultyAdjustment(3, [])
    expect(result).toBeNull()
  })

  it('混合结果（不连续）不应调整', () => {
    const result = calculateDifficultyAdjustment(3, [true, false, true])
    expect(result).toBeNull()
  })

  it('自定义配置应生效', () => {
    const config = { ...DEFAULT_DIFFICULTY_CONFIG, correct_streak_to_increase: 2 }
    const result = calculateDifficultyAdjustment(2, [true, true], config)
    expect(result).not.toBeNull()
    expect(result!.newDifficulty).toBe(3)
  })
})

describe('inferDifficultyFromMastery', () => {
  it('掌握度 0 → 难度 1', () => {
    expect(inferDifficultyFromMastery(0)).toBe(1)
  })

  it('掌握度 50 → 难度 3', () => {
    expect(inferDifficultyFromMastery(50)).toBe(3)
  })

  it('掌握度 90 → 难度 5', () => {
    expect(inferDifficultyFromMastery(90)).toBe(5)
  })

  it('边界值 20 → 难度 2', () => {
    expect(inferDifficultyFromMastery(20)).toBe(2)
  })

  it('边界值 60 → 难度 4', () => {
    expect(inferDifficultyFromMastery(60)).toBe(4)
  })

  it('边界值 80 → 难度 5', () => {
    expect(inferDifficultyFromMastery(80)).toBe(5)
  })
})
