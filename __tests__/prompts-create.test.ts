import {
  getStoryPrompt,
  getMathPrompt,
  getEnglishPrompt,
  getCreatePromptBySubject,
  inferCreationType,
  getDefaultCoverEmoji,
} from '@/lib/ai/prompts-create'

describe('Phase 3: 创造模式 Prompt', () => {
  describe('getStoryPrompt', () => {
    it('应包含花园精灵基础人设', () => {
      const prompt = getStoryPrompt()
      expect(prompt).toContain('花园精灵')
    })

    it('应包含故事创作关键词', () => {
      const prompt = getStoryPrompt()
      expect(prompt).toContain('故事创作')
      expect(prompt).toContain('creation_page')
      expect(prompt).toContain('creation_title')
      expect(prompt).toContain('creation_complete')
    })

    it('应包含结构化输出格式', () => {
      const prompt = getStoryPrompt()
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('emotion')
    })
  })

  describe('getMathPrompt', () => {
    it('应包含数学探索关键词', () => {
      const prompt = getMathPrompt()
      expect(prompt).toContain('数学探索')
      expect(prompt).toContain('emoji 可视化')
    })

    it('应包含 creation_page 指令', () => {
      const prompt = getMathPrompt()
      expect(prompt).toContain('creation_page')
    })
  })

  describe('getEnglishPrompt', () => {
    it('应包含英语冒险关键词', () => {
      const prompt = getEnglishPrompt()
      expect(prompt).toContain('英语冒险')
      expect(prompt).toContain('中英混合')
    })

    it('应包含新单词格式说明', () => {
      const prompt = getEnglishPrompt()
      expect(prompt).toContain('word (中文) emoji')
    })
  })

  describe('getCreatePromptBySubject', () => {
    it('中文应返回故事 prompt', () => {
      const prompt = getCreatePromptBySubject('chinese')
      expect(prompt).toContain('故事创作')
    })

    it('数学应返回数学 prompt', () => {
      const prompt = getCreatePromptBySubject('math')
      expect(prompt).toContain('数学探索')
    })

    it('英语应返回英语 prompt', () => {
      const prompt = getCreatePromptBySubject('english')
      expect(prompt).toContain('英语冒险')
    })

    it('未指定学科应默认返回故事 prompt', () => {
      const prompt = getCreatePromptBySubject()
      expect(prompt).toContain('故事创作')
    })
  })

  describe('inferCreationType', () => {
    it('中文 → story', () => {
      expect(inferCreationType('chinese')).toBe('story')
    })

    it('数学 → math_exploration', () => {
      expect(inferCreationType('math')).toBe('math_exploration')
    })

    it('英语 → english_adventure', () => {
      expect(inferCreationType('english')).toBe('english_adventure')
    })

    it('未指定 → story', () => {
      expect(inferCreationType()).toBe('story')
    })
  })

  describe('getDefaultCoverEmoji', () => {
    it('中文 → 📖', () => {
      expect(getDefaultCoverEmoji('chinese')).toBe('📖')
    })

    it('数学 → 🔢', () => {
      expect(getDefaultCoverEmoji('math')).toBe('🔢')
    })

    it('英语 → 🔤', () => {
      expect(getDefaultCoverEmoji('english')).toBe('🔤')
    })

    it('未指定 → 📖', () => {
      expect(getDefaultCoverEmoji()).toBe('📖')
    })
  })
})
