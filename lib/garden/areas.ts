/**
 * 花园区域管理
 * 处理多学科区域布局、解锁条件检查
 */

import type { Subject } from '@/types'

export interface GardenAreaConfig {
  area_name: string
  area_type: 'default' | 'unlockable'
  subject: Subject | null
  label: string
  emoji: string
  /** 区域在画布中的占比（%） */
  bounds: { x: number; y: number; w: number; h: number }
  /** 区域背景色（半透明） */
  bgColor: string
  /** 解锁条件描述 */
  unlockDescription?: string
  /** 解锁条件（JSON 格式，与数据库一致） */
  unlockCondition: Record<string, number>
}

/**
 * 默认花园区域配置
 * 4 个区域：中央综合 + 三个学科
 */
export const GARDEN_AREAS: GardenAreaConfig[] = [
  {
    area_name: '综合花园',
    area_type: 'default',
    subject: null,
    label: '综合花园',
    emoji: '🌺',
    bounds: { x: 25, y: 0, w: 50, h: 50 },
    bgColor: 'rgba(255, 179, 0, 0.08)',
    unlockCondition: {},
  },
  {
    area_name: '语文花园',
    area_type: 'unlockable',
    subject: 'chinese',
    label: '语文花园',
    emoji: '🌸',
    bounds: { x: 0, y: 0, w: 25, h: 100 },
    bgColor: 'rgba(233, 30, 99, 0.06)',
    unlockDescription: '语文相关植物达到 3 棵即可解锁',
    unlockCondition: { chinese_plants: 3 },
  },
  {
    area_name: '数学花田',
    area_type: 'unlockable',
    subject: 'math',
    label: '数学花田',
    emoji: '🌻',
    bounds: { x: 75, y: 0, w: 25, h: 100 },
    bgColor: 'rgba(255, 193, 7, 0.06)',
    unlockDescription: '数学相关植物达到 3 棵即可解锁',
    unlockCondition: { math_plants: 3 },
  },
  {
    area_name: '英语花坊',
    area_type: 'unlockable',
    subject: 'english',
    label: '英语花坊',
    emoji: '🌼',
    bounds: { x: 25, y: 50, w: 50, h: 50 },
    bgColor: 'rgba(33, 150, 243, 0.06)',
    unlockDescription: '英语相关植物达到 3 棵即可解锁',
    unlockCondition: { english_plants: 3 },
  },
]

export interface AreaUnlockStatus {
  area_name: string
  is_unlocked: boolean
  progress: number      // 0-1 解锁进度
  current: number       // 当前值
  required: number      // 目标值
}

/**
 * 检查各区域的解锁状态
 * @param plantsBySubject 各学科的植物数量
 * @param totalBlooming 总开花数
 */
export function checkAreaUnlockStatus(
  plantsBySubject: Record<string, number>,
  _totalBlooming: number,
): AreaUnlockStatus[] {
  return GARDEN_AREAS.map(area => {
    // 默认区域始终解锁
    if (area.area_type === 'default') {
      return { area_name: area.area_name, is_unlocked: true, progress: 1, current: 0, required: 0 }
    }

    // 检查各解锁条件
    const conditions = Object.entries(area.unlockCondition)
    if (conditions.length === 0) {
      return { area_name: area.area_name, is_unlocked: true, progress: 1, current: 0, required: 0 }
    }

    let allMet = true
    let minProgress = 1
    let current = 0
    let required = 0

    for (const [key, target] of conditions) {
      let value = 0
      // "chinese_plants" → plantsBySubject['chinese']
      if (key.endsWith('_plants')) {
        const subject = key.replace('_plants', '')
        value = plantsBySubject[subject] || 0
      }
      // "total_blooming" → totalBlooming
      else if (key === 'total_blooming') {
        value = _totalBlooming
      }

      const progress = Math.min(1, value / target)
      if (progress < 1) allMet = false
      if (progress < minProgress) {
        minProgress = progress
        current = value
        required = target
      }
    }

    return {
      area_name: area.area_name,
      is_unlocked: allMet,
      progress: minProgress,
      current,
      required,
    }
  })
}

/**
 * 根据植物的学科分配到对应区域
 * 并在区域内计算随机位置
 */
export function assignPlantToArea(
  subject: Subject | null | undefined,
  isAreaUnlocked: (s: Subject | null) => boolean,
): { x: number; y: number } {
  // 如果植物的学科区域已解锁，放到对应区域
  const targetArea = GARDEN_AREAS.find(a =>
    a.subject === subject && isAreaUnlocked(a.subject)
  ) || GARDEN_AREAS[0] // fallback 到综合花园

  const b = targetArea.bounds
  // 在区域内随机分布（留 10% 边距）
  const margin = 0.1
  const x = b.x + b.w * (margin + Math.random() * (1 - 2 * margin))
  const y = b.y + b.h * (margin + Math.random() * (1 - 2 * margin))

  return { x, y }
}
