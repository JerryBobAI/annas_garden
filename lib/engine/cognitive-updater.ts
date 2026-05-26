/**
 * 认知档案自动更新器
 *
 * 每次对话结束后触发，基于对话数据更新孩子的认知档案：
 * 1. 偏好模式（最近 N 次对话的模式分布）
 * 2. 平均专注时长（指数移动平均）
 * 3. 兴趣标签（最近对话的 top 知识点）
 * 4. 计数器（总对话数、总消息数）
 */

import type { LearningMode, Subject } from '@/types'

// 对话数据（由 /api/ai/chat 的 onFinish 收集）
export interface ConversationData {
  mode: LearningMode
  duration: number            // 秒
  messageCount: number
  knowledgeTags: string[]
  subject?: Subject
}

// 认知档案更新结果
export interface ProfileUpdate {
  preferred_mode: LearningMode
  attention_span_avg: number
  interests: string[]
  total_conversations: number
  total_messages: number
}

/**
 * 计算偏好模式
 *
 * 统计最近 N 次对话的模式分布，取出现最多的模式
 *
 * @param recentModes - 最近 N 次对话的模式列表
 * @returns 偏好模式
 */
export function calculatePreferredMode(
  recentModes: LearningMode[]
): LearningMode {
  if (recentModes.length === 0) return 'explore'

  const modeCount = recentModes.reduce<Record<string, number>>((acc, m) => {
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})

  const sorted = Object.entries(modeCount).sort((a, b) => b[1] - a[1])
  return (sorted[0]?.[0] as LearningMode) || 'explore'
}

/**
 * 计算平均专注时长（指数移动平均）
 *
 * 使用 EMA 平滑：new_avg = old_avg * 0.8 + current * 0.2
 * 这样最近的数据权重更大，历史数据逐渐衰减
 *
 * @param currentAvg - 当前平均值（秒）
 * @param newDuration - 本次对话时长（秒）
 * @returns 更新后的平均值（秒）
 */
export function calculateAttentionSpan(
  currentAvg: number,
  newDuration: number
): number {
  if (currentAvg === 0) return newDuration
  return Math.round(currentAvg * 0.8 + newDuration * 0.2)
}

/**
 * 提取 Top N 兴趣标签
 *
 * 统计标签出现频率，返回最高的 N 个
 *
 * @param allTags - 所有标签列表（可能有重复）
 * @param limit - 最多返回几个（默认 10）
 * @returns Top N 标签列表
 */
export function getTopInterests(
  allTags: string[],
  limit: number = 10
): string[] {
  const tagCount = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1
    return acc
  }, {})

  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag)
}

/**
 * 计算认知档案更新
 *
 * 纯函数：输入旧数据 + 新对话数据 → 输出更新后的数据
 * 不涉及数据库操作，方便单元测试
 *
 * @param currentProfile - 当前认知档案数据
 * @param conversationData - 本次对话数据
 * @param recentModes - 最近 N 次对话的模式列表（含本次）
 * @param recentTags - 最近 N 次对话的所有知识点标签
 * @returns 更新字段
 */
export function computeProfileUpdate(
  currentProfile: {
    attention_span_avg: number
    total_conversations: number
    total_messages: number
  },
  conversationData: ConversationData,
  recentModes: LearningMode[],
  recentTags: string[]
): ProfileUpdate {
  return {
    preferred_mode: calculatePreferredMode(recentModes),
    attention_span_avg: calculateAttentionSpan(
      currentProfile.attention_span_avg,
      conversationData.duration
    ),
    interests: getTopInterests(recentTags),
    total_conversations: currentProfile.total_conversations + 1,
    total_messages: currentProfile.total_messages + conversationData.messageCount,
  }
}
