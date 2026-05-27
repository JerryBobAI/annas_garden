/**
 * 报告调度器
 *
 * 职责：
 * 1. 判断是否需要生成新报告（距上次报告超过 7 天）
 * 2. 提供调度逻辑给 API 层调用
 *
 * 纯函数 + 类型定义，不涉及数据库操作
 */

export interface ReportScheduleCheck {
  /** 是否需要生成新报告 */
  shouldGenerate: boolean
  /** 报告类型 */
  reportType: 'weekly' | 'monthly'
  /** 报告覆盖的时间段起始 */
  periodStart: string
  /** 报告覆盖的时间段结束 */
  periodEnd: string
  /** 原因说明 */
  reason: string
}

/**
 * 检查是否需要生成新报告
 *
 * 规则：
 * - 如果从未生成过报告 → 生成首份周报
 * - 如果上次周报超过 7 天 → 生成新周报
 * - 如果上次月报超过 30 天 → 生成新月报
 * - 如果上次报告在 7 天内 → 不需要生成
 *
 * @param lastReportDate - 上次报告日期（ISO 字符串），null 表示从未生成
 * @param now - 当前时间（用于测试注入）
 * @returns 调度检查结果
 */
export function checkReportSchedule(
  lastReportDate: string | null,
  now: Date = new Date(),
): ReportScheduleCheck {
  const periodEnd = now.toISOString().split('T')[0]

  // 从未生成过报告
  if (!lastReportDate) {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return {
      shouldGenerate: true,
      reportType: 'weekly',
      periodStart: weekAgo.toISOString().split('T')[0],
      periodEnd,
      reason: '首次生成学习报告',
    }
  }

  const lastDate = new Date(lastReportDate)
  const daysSinceLastReport = Math.floor(
    (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // 距上次报告不足 7 天
  if (daysSinceLastReport < 7) {
    return {
      shouldGenerate: false,
      reportType: 'weekly',
      periodStart: lastReportDate,
      periodEnd,
      reason: `距上次报告仅 ${daysSinceLastReport} 天，7 天后再生成`,
    }
  }

  // 超过 30 天 → 月报
  if (daysSinceLastReport >= 30) {
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    return {
      shouldGenerate: true,
      reportType: 'monthly',
      periodStart: monthAgo.toISOString().split('T')[0],
      periodEnd,
      reason: `距上次报告 ${daysSinceLastReport} 天，生成月度报告`,
    }
  }

  // 7-29 天 → 周报
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  return {
    shouldGenerate: true,
    reportType: 'weekly',
    periodStart: weekAgo.toISOString().split('T')[0],
    periodEnd,
    reason: `距上次报告 ${daysSinceLastReport} 天，生成新周报`,
  }
}
