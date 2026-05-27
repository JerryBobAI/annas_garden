/**
 * 艾宾浩斯遗忘曲线复习调度引擎
 *
 * 核心公式：retention = e^(-t/S)
 * - t = 距上次练习的天数
 * - S = 稳定性因子（由掌握度和练习次数决定）
 *
 * 当记忆保持率低于阈值时，标记为需要复习。
 * 精灵在对话中自然提起：「上次那个减法问题，你还记得吗？」
 */

import type { KnowledgeMastery, Subject } from '@/types'

// ============================================
// 常量配置
// ============================================

/** 记忆保持率低于此阈值时触发复习 */
const REVIEW_THRESHOLD = 0.5

/** 基础稳定性（天）— 只练过一次的知识点大约 1 天后忘记 50% */
const BASE_STABILITY_DAYS = 1.5

/** 每次正确练习后稳定性的增长因子 */
const STABILITY_GROWTH = 1.8

/** 掌握度对稳定性的加成（掌握度越高，遗忘越慢） */
const MASTERY_BONUS = 0.02

/** 每次推荐最多返回的复习项 */
const MAX_REVIEW_ITEMS = 5

/** 最低练习次数要求（至少练过 1 次才需要复习） */
const MIN_PRACTICE_COUNT = 1

// ============================================
// 核心类型
// ============================================

export interface ReviewItem {
  knowledge_point: string
  subject: Subject
  mastery_level: number
  retention: number           // 当前记忆保持率 0-1
  days_since_practice: number // 距上次练习天数
  priority: number            // 复习优先级（越高越急）
  suggestion: string          // 精灵的自然语言提示
}

export interface ReviewSchedule {
  items: ReviewItem[]         // 需复习的知识点（按优先级排序）
  total_due: number           // 总共到期的数量
  next_review_at?: string     // 下一个即将到期的时间
}

// ============================================
// 核心算法
// ============================================

/**
 * 计算知识点的稳定性 S（决定遗忘速度）
 * 练习越多、掌握度越高 → 稳定性越高 → 遗忘越慢
 */
export function calculateStability(
  practiceCount: number,
  masteryLevel: number
): number {
  // S = BASE × GROWTH^(practiceCount - 1) × (1 + MASTERY_BONUS × mastery)
  const growthFactor = Math.pow(STABILITY_GROWTH, Math.max(0, practiceCount - 1))
  const masteryFactor = 1 + MASTERY_BONUS * masteryLevel
  return BASE_STABILITY_DAYS * growthFactor * masteryFactor
}

/**
 * 计算记忆保持率 R（艾宾浩斯遗忘曲线）
 * R = e^(-t/S)
 */
export function calculateRetention(
  daysSincePractice: number,
  stability: number
): number {
  if (daysSincePractice <= 0) return 1
  return Math.exp(-daysSincePractice / stability)
}

/**
 * 计算距上次练习的天数
 */
export function daysSince(lastPracticedAt: string | undefined): number {
  if (!lastPracticedAt) return Infinity
  const last = new Date(lastPracticedAt)
  const now = new Date()
  return (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
}

/**
 * 生成精灵的自然提示语
 * 不是冷冰冰的"需要复习"，而是精灵关心地提起
 */
function generateSuggestion(
  point: string,
  daysSincePractice: number,
  retention: number
): string {
  if (retention < 0.3) {
    // 严重遗忘
    const templates = [
      `还记得「${point}」吗？好像很久没练了，要不要再试试看？`,
      `精灵发现「${point}」有点生疏了呢，咱们再玩一次吧！`,
      `「${point}」在花园里有点渴了，帮它浇浇水吧 💧`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  } else if (retention < 0.5) {
    // 中度遗忘
    const days = Math.round(daysSincePractice)
    const templates = [
      `「${point}」上次练习是 ${days} 天前哦，趁还记得赶紧巩固一下吧！`,
      `精灵想考考你：「${point}」还记得多少？来挑战一下！`,
      `花园里的「${point}」需要照顾啦，帮它浇水施肥吧 🌱`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  } else {
    // 轻度遗忘
    const templates = [
      `「${point}」快要忘记了，赶紧复习一下吧~`,
      `精灵提醒你：再练一次「${point}」会记得更牢哦！`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }
}

// ============================================
// 主接口
// ============================================

/**
 * 获取复习调度
 *
 * @param masteryData - 孩子的所有知识点掌握数据
 * @param subjectFilter - 可选学科筛选
 * @returns 按优先级排序的复习计划
 */
export function getReviewSchedule(
  masteryData: KnowledgeMastery[],
  subjectFilter?: Subject
): ReviewSchedule {
  const reviewItems: ReviewItem[] = []

  for (const item of masteryData) {
    // 过滤学科
    if (subjectFilter && item.subject !== subjectFilter) continue
    // 至少练过一次
    if (item.practice_count < MIN_PRACTICE_COUNT) continue
    // 已经完全掌握的不需要复习（mastery > 95）
    if (item.mastery_level >= 95) continue

    const days = daysSince(item.last_practiced_at)
    if (!isFinite(days)) continue

    const stability = calculateStability(item.practice_count, item.mastery_level)
    const retention = calculateRetention(days, stability)

    // 低于阈值才加入复习列表
    if (retention < REVIEW_THRESHOLD) {
      // 优先级：保持率越低越急，掌握度越低越急
      const priority = (1 - retention) * (1 - item.mastery_level / 100)

      reviewItems.push({
        knowledge_point: item.knowledge_point,
        subject: item.subject,
        mastery_level: item.mastery_level,
        retention: Math.round(retention * 100) / 100,
        days_since_practice: Math.round(days * 10) / 10,
        priority: Math.round(priority * 1000) / 1000,
        suggestion: generateSuggestion(item.knowledge_point, days, retention),
      })
    }
  }

  // 按优先级降序
  reviewItems.sort((a, b) => b.priority - a.priority)

  // 计算下一个即将到期的
  let nextReviewAt: string | undefined
  const notYetDue = masteryData
    .filter(m => m.practice_count >= MIN_PRACTICE_COUNT && m.mastery_level < 95)
    .map(m => {
      const days = daysSince(m.last_practiced_at)
      if (!isFinite(days)) return null
      const stability = calculateStability(m.practice_count, m.mastery_level)
      const retention = calculateRetention(days, stability)
      if (retention >= REVIEW_THRESHOLD) {
        // 计算何时会降到阈值
        // R = e^(-t/S) = THRESHOLD → t = -S × ln(THRESHOLD)
        const totalDaysToThreshold = -stability * Math.log(REVIEW_THRESHOLD)
        const daysRemaining = totalDaysToThreshold - days
        if (daysRemaining > 0) {
          const reviewDate = new Date()
          reviewDate.setTime(reviewDate.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
          return reviewDate.toISOString()
        }
      }
      return null
    })
    .filter(Boolean)
    .sort()

  if (notYetDue.length > 0) {
    nextReviewAt = notYetDue[0] as string
  }

  return {
    items: reviewItems.slice(0, MAX_REVIEW_ITEMS),
    total_due: reviewItems.length,
    next_review_at: nextReviewAt,
  }
}

/**
 * 获取精灵对话中的复习注入 prompt
 * 在对话开始时，如果有需要复习的内容，精灵自然提起
 */
export function getReviewPromptInjection(schedule: ReviewSchedule): string | null {
  if (schedule.items.length === 0) return null

  const topItems = schedule.items.slice(0, 3)
  const points = topItems.map(i => `「${i.knowledge_point}」(保持率${Math.round(i.retention * 100)}%)`).join('、')

  return `【复习提醒】孩子以下知识点记忆正在消退，请在对话中自然引导复习（不要直接说"复习"）：${points}。用故事情境或追问的方式让孩子重新接触这些知识点。`
}
