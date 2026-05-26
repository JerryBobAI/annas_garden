/**
 * 自适应难度调整引擎
 *
 * 规则：
 * - 连续答对 N 次（默认 3）→ 难度 +1
 * - 连续答错 N 次（默认 2）→ 难度 -1
 * - 难度范围 1-5
 * - 每次调整记录到 difficulty_history
 *
 * 防挫败机制：
 * - 连续答错 2 次 → 降低难度 + 精灵鼓励
 * - 难度降到 1 仍然答错 → 精灵提供更多引导（拆解步骤）
 * - 不显示"你降级了"，而是说"我们换个方式试试！"
 */

import type { AdaptiveDifficultyConfig } from '@/types'

// 默认难度配置
export const DEFAULT_DIFFICULTY_CONFIG: AdaptiveDifficultyConfig = {
  correct_streak_to_increase: 3,
  wrong_streak_to_decrease: 2,
  min_difficulty: 1,
  max_difficulty: 5,
  step_size: 1,
}

// 难度调整结果
export interface DifficultyAdjustment {
  newDifficulty: number
  reason: string
  encouragement?: string  // 降难度时的鼓励语（注入到精灵对话中）
}

/**
 * 计算末尾连续 true 的个数
 * 例如: [false, true, true, true] → 3
 */
export function countTrailingTrue(results: boolean[]): number {
  let count = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) count++
    else break
  }
  return count
}

/**
 * 计算末尾连续 false 的个数
 * 例如: [true, false, false] → 2
 */
export function countTrailingFalse(results: boolean[]): number {
  let count = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (!results[i]) count++
    else break
  }
  return count
}

/**
 * 计算难度调整
 *
 * @param currentDifficulty - 当前难度（1-5）
 * @param recentResults - 最近的答题结果，true = 正确，按时间顺序排列
 * @param config - 难度配置（可选）
 * @returns 调整结果，null 表示不需要调整
 */
export function calculateDifficultyAdjustment(
  currentDifficulty: number,
  recentResults: boolean[],
  config: AdaptiveDifficultyConfig = DEFAULT_DIFFICULTY_CONFIG
): DifficultyAdjustment | null {
  if (recentResults.length === 0) return null

  // 1. 检查连续正确 → 升级
  const correctStreak = countTrailingTrue(recentResults)
  if (correctStreak >= config.correct_streak_to_increase) {
    const newDiff = Math.min(config.max_difficulty, currentDifficulty + config.step_size)
    if (newDiff !== currentDifficulty) {
      return {
        newDifficulty: newDiff,
        reason: `${correctStreak}_correct_streak`,
      }
    }
  }

  // 2. 检查连续错误 → 降级
  const wrongStreak = countTrailingFalse(recentResults)
  if (wrongStreak >= config.wrong_streak_to_decrease) {
    const newDiff = Math.max(config.min_difficulty, currentDifficulty - config.step_size)
    if (newDiff !== currentDifficulty) {
      return {
        newDifficulty: newDiff,
        reason: `${wrongStreak}_wrong_streak`,
        encouragement: getEncouragement(newDiff, config.min_difficulty),
      }
    }
    // 已经在最低难度，仍然答错 → 给予特殊鼓励
    if (currentDifficulty === config.min_difficulty) {
      return {
        newDifficulty: currentDifficulty,
        reason: `${wrongStreak}_wrong_streak_at_min`,
        encouragement: '没关系！我们一步一步来，我来帮你把这个问题拆开看看 🌟',
      }
    }
  }

  return null // 不调整
}

/**
 * 获取降难度时的鼓励语
 * 不说"降级"，而是正面引导
 */
function getEncouragement(newDifficulty: number, minDifficulty: number): string {
  if (newDifficulty === minDifficulty) {
    return '我们换个方式试试！有时候换个角度就能想明白 🌈'
  }
  const encouragements = [
    '我们来试试不一样的题目吧！💪',
    '没关系，每个人都有需要多想一想的时候 🌻',
    '慢慢来，我们换个有趣的方式再试试！✨',
    '这个有点难呢，我们先练练其他的好不好？🌸',
  ]
  return encouragements[Math.floor(Math.random() * encouragements.length)]
}

/**
 * 根据掌握度推算初始难度
 *
 * 掌握度 0-20  → 难度 1
 * 掌握度 20-40 → 难度 2
 * 掌握度 40-60 → 难度 3
 * 掌握度 60-80 → 难度 4
 * 掌握度 80+   → 难度 5
 *
 * @param masteryLevel - 掌握度 (0-100)
 * @returns 推荐的初始难度 (1-5)
 */
export function inferDifficultyFromMastery(masteryLevel: number): number {
  if (masteryLevel >= 80) return 5
  if (masteryLevel >= 60) return 4
  if (masteryLevel >= 40) return 3
  if (masteryLevel >= 20) return 2
  return 1
}
