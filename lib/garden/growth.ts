/**
 * 花园植物成长逻辑
 * 处理 AI 对话中的 garden_event，驱动植物状态变化
 */

export type PlantType = 'seed' | 'sprout' | 'growing' | 'blooming' | 'withered'
export type GardenEventType = 'seed_planted' | 'sprout' | 'bloom'
export type Subject = 'math' | 'chinese' | 'english'

export interface GardenPlant {
  id: string
  child_id: string
  name: string
  plant_type: PlantType
  subject: Subject | null
  knowledge_tags: string[]
  source_conversation_id: string | null
  growth_stage: number  // 0-100
  last_watered_at: string | null
  position_x: number
  position_y: number
  created_at: string
}

export interface GardenAction {
  type: 'create' | 'upgrade'
  plant?: Partial<GardenPlant>
  match?: {
    knowledge_tags: string[]
    plant_type?: PlantType[]
  }
  upgrade?: {
    growth_stage_increment?: number
    growth_stage?: number
    plant_type?: PlantType
  }
}

/**
 * 根据 AI 对话中的 garden_event 生成花园操作指令
 */
export function processGardenEvent(
  event: GardenEventType,
  conversationId: string,
  knowledgeTags: string[],
  subject?: Subject
): GardenAction {
  switch (event) {
    case 'seed_planted':
      return {
        type: 'create',
        plant: {
          plant_type: 'seed',
          growth_stage: 0,
          subject: subject || null,
          knowledge_tags: knowledgeTags,
          source_conversation_id: conversationId,
          // 位置由前端随机分配
          position_x: Math.random() * 80 + 10,  // 10-90%
          position_y: Math.random() * 60 + 20,  // 20-80%
        }
      }

    case 'sprout':
      return {
        type: 'upgrade',
        match: {
          knowledge_tags: knowledgeTags,
          plant_type: ['seed', 'sprout'],
        },
        upgrade: {
          growth_stage_increment: 25,
        }
      }

    case 'bloom':
      return {
        type: 'upgrade',
        match: {
          knowledge_tags: knowledgeTags,
        },
        upgrade: {
          growth_stage: 100,
          plant_type: 'blooming',
        }
      }
  }
}

/**
 * growth_stage → plant_type 映射
 */
export function stageToType(stage: number): PlantType {
  if (stage <= 0) return 'seed'
  if (stage <= 25) return 'sprout'
  if (stage < 100) return 'growing'
  return 'blooming'
}

/**
 * 每个学科在各成长阶段的 emoji
 * 让花园视觉更丰富多样（G3）
 */
const PLANT_EMOJI_MAP: Record<string, Record<PlantType, string>> = {
  chinese: { seed: '\u{1F330}', sprout: '\u{1F331}', growing: '\u{1F38B}', blooming: '\u{1F338}', withered: '\u{1F940}' },
  math:    { seed: '\u{1F330}', sprout: '\u{1F331}', growing: '\u{1F335}', blooming: '\u{1F33B}', withered: '\u{1F940}' },
  english: { seed: '\u{1F330}', sprout: '\u{1F331}', growing: '\u2618\uFE0F',  blooming: '\u{1F33C}', withered: '\u{1F940}' },
  default: { seed: '\u{1F330}', sprout: '\u{1F331}', growing: '\u{1F33F}', blooming: '\u{1F33A}', withered: '\u{1F940}' },
}

/**
 * 根据学科和植物状态返回对应 emoji
 * G3: 每个学科+阶段组合都有独特 emoji
 */
export function getPlantEmoji(type: PlantType, subject?: Subject | null): string {
  const key = subject || 'default'
  return PLANT_EMOJI_MAP[key]?.[type] ?? PLANT_EMOJI_MAP.default[type]
}

/**
 * 根据植物状态返回尺寸（px）
 */
export function getPlantSize(type: PlantType): number {
  switch (type) {
    case 'seed': return 24
    case 'sprout': return 32
    case 'growing': return 40
    case 'blooming': return 48
    case 'withered': return 32
  }
}

/**
 * 生成植物名字（基于知识标签 + 学科）
 */
export function generatePlantName(knowledgeTags: string[], subject?: Subject): string {
  const tag = knowledgeTags[0] || '知识'
  const subjectNames: Record<string, string> = {
    math: '数学',
    chinese: '语文',
    english: '英语',
  }
  const subjectName = subject ? subjectNames[subject] : '综合'
  return `${subjectName}·${tag}`
}
