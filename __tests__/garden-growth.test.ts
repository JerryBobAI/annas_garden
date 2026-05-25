/**
 * 花园成长逻辑单元测试
 */
import {
  processGardenEvent,
  stageToType,
  getPlantEmoji,
  getPlantSize,
  generatePlantName,
} from '@/lib/garden/growth'

describe('花园成长逻辑', () => {
  describe('processGardenEvent', () => {
    it('seed_planted 创建种子', () => {
      const action = processGardenEvent('seed_planted', 'conv-1', ['加法'], 'math')
      expect(action.type).toBe('create')
      expect(action.plant?.plant_type).toBe('seed')
      expect(action.plant?.growth_stage).toBe(0)
      expect(action.plant?.subject).toBe('math')
      expect(action.plant?.knowledge_tags).toEqual(['加法'])
      expect(action.plant?.source_conversation_id).toBe('conv-1')
    })

    it('sprout 升级匹配植物', () => {
      const action = processGardenEvent('sprout', 'conv-2', ['乘法'])
      expect(action.type).toBe('upgrade')
      expect(action.match?.knowledge_tags).toEqual(['乘法'])
      expect(action.match?.plant_type).toEqual(['seed', 'sprout'])
      expect(action.upgrade?.growth_stage_increment).toBe(25)
    })

    it('bloom 将植物开花', () => {
      const action = processGardenEvent('bloom', 'conv-3', ['分数'])
      expect(action.type).toBe('upgrade')
      expect(action.upgrade?.growth_stage).toBe(100)
      expect(action.upgrade?.plant_type).toBe('blooming')
    })
  })

  describe('stageToType', () => {
    it('0 → seed', () => expect(stageToType(0)).toBe('seed'))
    it('25 → sprout', () => expect(stageToType(25)).toBe('sprout'))
    it('50 → growing', () => expect(stageToType(50)).toBe('growing'))
    it('100 → blooming', () => expect(stageToType(100)).toBe('blooming'))
  })

  describe('getPlantEmoji', () => {
    it('withered → 🥀', () => expect(getPlantEmoji('withered')).toBe('🥀'))
    it('seed → 🌰', () => expect(getPlantEmoji('seed')).toBe('🌰'))
    it('sprout → 🌱', () => expect(getPlantEmoji('sprout')).toBe('🌱'))
    it('growing → 🌿', () => expect(getPlantEmoji('growing')).toBe('🌿'))
    it('blooming math → 🌻', () => expect(getPlantEmoji('blooming', 'math')).toBe('🌻'))
    it('blooming chinese → 🌸', () => expect(getPlantEmoji('blooming', 'chinese')).toBe('🌸'))
    it('blooming english → 🌼', () => expect(getPlantEmoji('blooming', 'english')).toBe('🌼'))
    it('blooming null → 🌺', () => expect(getPlantEmoji('blooming')).toBe('🌺'))
  })

  describe('getPlantSize', () => {
    it('seed = 24', () => expect(getPlantSize('seed')).toBe(24))
    it('blooming = 48', () => expect(getPlantSize('blooming')).toBe(48))
  })

  describe('generatePlantName', () => {
    it('生成带学科的名字', () => {
      expect(generatePlantName(['加法'], 'math')).toBe('数学·加法')
    })
    it('无学科时用综合', () => {
      expect(generatePlantName(['思考'])).toBe('综合·思考')
    })
    it('无标签时用知识', () => {
      expect(generatePlantName([])).toBe('综合·知识')
    })
  })
})
