import { getSystemPrompt } from '@/lib/ai/prompts'

describe('getSystemPrompt', () => {
  it('explore 模式包含探索指令', () => {
    const prompt = getSystemPrompt('explore')
    expect(prompt).toContain('探索')
    expect(prompt).toContain('JSON')
  })

  it('quest 模式包含任务指令', () => {
    const prompt = getSystemPrompt('quest')
    expect(prompt).toContain('任务')
  })

  it('create 模式包含创造指令', () => {
    const prompt = getSystemPrompt('create')
    expect(prompt).toContain('创造')
  })

  it('subject 参数正确注入到 quest 模式', () => {
    const prompt = getSystemPrompt('quest', 'math')
    expect(prompt).toContain('数学')
  })

  it('explore 模式不依赖 subject', () => {
    const prompt = getSystemPrompt('explore')
    // 不应报错，prompt 应包含基础指令
    expect(prompt.length).toBeGreaterThan(100)
  })
})
