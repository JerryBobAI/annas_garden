/**
 * 学习报告生成器
 *
 * 职责：
 * 1. 聚合指定时间段内的学习数据
 * 2. 构建结构化报告内容 (ReportContent)
 * 3. 为 AI 生成自然语言摘要准备数据
 *
 * 注意：纯数据聚合逻辑，不涉及数据库操作
 * 数据库查询由 API 路由层负责，这里只做纯函数计算
 */

import type { Subject, ReportContent, LearningMode } from '@/types'

// 对话摘要（由 API 层从数据库查询并传入）
export interface ConversationSummary {
  id: string
  mode: LearningMode
  subject?: string
  message_count: number
  duration_minutes: number
  knowledge_tags: string[]
  started_at: string
}

// 掌握度变化（由 API 层从数据库查询并传入）
export interface MasteryChange {
  knowledge_point: string
  subject: Subject
  mastery_before: number
  mastery_after: number
}

// 创作摘要
export interface CreationSummary {
  id: string
  creation_type: string
  title: string
  subject: Subject
}

// 花园统计
export interface GardenSummary {
  new_plants: number
  blooming: number
  total_plants: number
}

// 好奇心种子
export interface CuriositySummary {
  question: string
  topic?: string
}

/**
 * 构建报告结构化内容
 *
 * 将各维度的原始数据聚合为 ReportContent 格式
 *
 * @param conversations - 时间段内的对话摘要
 * @param masteryChanges - 知识掌握度变化
 * @param creations - 创作作品
 * @param garden - 花园统计
 * @param curiositySeeds - 好奇心种子
 * @returns 结构化报告内容
 */
export function buildReportContent(
  conversations: ConversationSummary[],
  masteryChanges: MasteryChange[],
  creations: CreationSummary[],
  garden: GardenSummary,
  curiositySeeds: CuriositySummary[]
): ReportContent {
  // 1. 学习概览
  const modeDistribution: Record<string, number> = {}
  const subjectDistribution: Record<string, number> = {}
  let totalDuration = 0

  for (const conv of conversations) {
    modeDistribution[conv.mode] = (modeDistribution[conv.mode] || 0) + 1
    if (conv.subject) {
      subjectDistribution[conv.subject] = (subjectDistribution[conv.subject] || 0) + 1
    }
    totalDuration += conv.duration_minutes
  }

  // 2. 兴趣追踪
  const topicCounts: Record<string, number> = {}
  for (const conv of conversations) {
    for (const tag of conv.knowledge_tags) {
      topicCounts[tag] = (topicCounts[tag] || 0) + 1
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      count,
      trend: 'stable' as const,  // 简化版，后续可与上期对比
    }))

  // 3. 知识掌握
  const subjectMastery = new Map<Subject, {
    levels: number[]
    improved: string[]
    struggling: string[]
  }>()

  for (const change of masteryChanges) {
    if (!subjectMastery.has(change.subject)) {
      subjectMastery.set(change.subject, { levels: [], improved: [], struggling: [] })
    }
    const entry = subjectMastery.get(change.subject)!
    entry.levels.push(change.mastery_after)

    const delta = change.mastery_after - change.mastery_before
    if (delta > 5) {
      entry.improved.push(change.knowledge_point)
    } else if (change.mastery_after < 50) {
      entry.struggling.push(change.knowledge_point)
    }
  }

  const bySubject = Array.from(subjectMastery.entries()).map(([subject, data]) => ({
    subject,
    overall_level: data.levels.length > 0
      ? Math.round(data.levels.reduce((a, b) => a + b, 0) / data.levels.length)
      : 0,
    improved: data.improved,
    struggling: data.struggling,
  }))

  const masteryChangeList = masteryChanges.map(c => ({
    point: c.knowledge_point,
    before: c.mastery_before,
    after: c.mastery_after,
  }))

  // 4. 创作活动
  const creationByType: Record<string, number> = {}
  for (const c of creations) {
    creationByType[c.creation_type] = (creationByType[c.creation_type] || 0) + 1
  }

  // 5. 组装报告
  return {
    overview: {
      total_conversations: conversations.length,
      total_duration_minutes: totalDuration,
      mode_distribution: modeDistribution,
      subject_distribution: subjectDistribution,
    },
    interests: {
      top_topics: topTopics,
      curiosity_seeds_count: curiositySeeds.length,
      new_explorations: curiositySeeds.slice(0, 5).map(s => s.question),
    },
    mastery: {
      by_subject: bySubject,
      mastery_changes: masteryChangeList,
    },
    creations: {
      total: creations.length,
      by_type: creationByType,
      highlights: creations.slice(0, 3).map(c => c.title),
    },
    garden,
  }
}

/**
 * 生成 AI 摘要的 prompt
 *
 * 将结构化报告内容转换为自然语言 prompt，
 * 让 AI 生成温暖亲切的家长报告
 *
 * @param content - 结构化报告内容
 * @param childName - 孩子名字
 * @returns 给 AI 的 prompt 文本
 */
export function buildReportPrompt(
  content: ReportContent,
  childName: string = '小朋友'
): string {
  return `你是一位温暖的教育顾问。请将以下学习数据转化为给家长的学习报告。

要求：
- 语言温暖亲切，不要太正式
- 重点表扬进步，委婉提及不足
- 用具体数据支撑观点
- 不超过 200 字
- 称呼孩子为"${childName}"

学习数据：
- 本周对话 ${content.overview.total_conversations} 次，共 ${content.overview.total_duration_minutes} 分钟
- 模式分布：${JSON.stringify(content.overview.mode_distribution)}
- 学科分布：${JSON.stringify(content.overview.subject_distribution)}
- 兴趣话题：${content.interests.top_topics.map(t => t.topic).join('、')}
- 好奇心问题 ${content.interests.curiosity_seeds_count} 个
${content.interests.new_explorations.length > 0 ? `- 新探索：${content.interests.new_explorations.join('、')}` : ''}
- 知识掌握：${content.mastery.by_subject.map(s => `${s.subject} ${s.overall_level}%`).join('、')}
${content.mastery.by_subject.flatMap(s => s.improved).length > 0 ? `- 进步明显：${content.mastery.by_subject.flatMap(s => s.improved).join('、')}` : ''}
${content.mastery.by_subject.flatMap(s => s.struggling).length > 0 ? `- 需要加油：${content.mastery.by_subject.flatMap(s => s.struggling).join('、')}` : ''}
- 创作 ${content.creations.total} 个作品
- 花园：新增 ${content.garden.new_plants} 棵，开花 ${content.garden.blooming} 棵，总计 ${content.garden.total_plants} 棵`
}

/**
 * 生成 AI 建议的 prompt
 *
 * @param content - 结构化报告内容
 * @param childName - 孩子名字
 * @returns 给 AI 的 prompt 文本
 */
export function buildSuggestionsPrompt(
  content: ReportContent,
  childName: string = '小朋友'
): string {
  return `你是一位经验丰富的教育顾问。请根据以下学习数据，给出 3 条具体的学习建议。

要求：
- 每条建议简短具体，可操作
- 结合孩子的兴趣点给建议
- 语言亲切易懂
- 返回 JSON 数组格式: ["建议1", "建议2", "建议3"]

${childName}的学习数据：
- 偏好模式：${Object.entries(content.overview.mode_distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || '探索'}
- 兴趣话题：${content.interests.top_topics.map(t => t.topic).join('、') || '暂无'}
- 薄弱环节：${content.mastery.by_subject.flatMap(s => s.struggling).join('、') || '暂无'}
- 进步方面：${content.mastery.by_subject.flatMap(s => s.improved).join('、') || '暂无'}
- 创作偏好：${Object.entries(content.creations.by_type).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'}
- 花园总量：${content.garden.total_plants} 棵植物`
}
