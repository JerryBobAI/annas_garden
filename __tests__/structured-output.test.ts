import { parseAIResponse, DEFAULT_OUTPUT } from '@/lib/ai/structured-output'

describe('parseAIResponse', () => {
  it('应能解析正常的 JSON 结构化输出', () => {
    const raw = JSON.stringify({
      text: '天空之所以是蓝色的，是因为光的散射！',
      commands: {
        emotion: 'happy',
        options: ['为什么日落是红色的？', '光还有什么有趣的性质？'],
        knowledge_tags: ['光学', '散射'],
        difficulty: 3,
      },
    })
    const result = parseAIResponse(raw)
    expect(result.text).toBe('天空之所以是蓝色的，是因为光的散射！')
    expect(result.commands.emotion).toBe('happy')
    expect(result.commands.options).toHaveLength(2)
    expect(result.commands.knowledge_tags).toEqual(['光学', '散射'])
  })

  it('应能解析 markdown 包裹的 JSON', () => {
    const raw = '```json\n{"text":"你好","commands":{"emotion":"happy"}}\n```'
    const result = parseAIResponse(raw)
    expect(result.text).toBe('你好')
    expect(result.commands.emotion).toBe('happy')
  })

  it('纯文字输入应回退为默认 commands', () => {
    const raw = '这只是一段普通的文字回复，没有 JSON。'
    const result = parseAIResponse(raw)
    expect(result.text).toBe(raw)
    expect(result.commands.emotion).toBe(DEFAULT_OUTPUT.emotion)
    expect(result.commands.options).toBeUndefined()
  })

  it('非法 emotion 值应回退为 happy', () => {
    const raw = JSON.stringify({
      text: '测试',
      commands: { emotion: 'angry' },
    })
    const result = parseAIResponse(raw)
    expect(result.commands.emotion).toBe('happy')
  })

  it('options 超过 4 个应被截断', () => {
    const raw = JSON.stringify({
      text: '测试',
      commands: {
        emotion: 'happy',
        options: ['A', 'B', 'C', 'D', 'E', 'F'],
      },
    })
    const result = parseAIResponse(raw)
    expect(result.commands.options?.length ?? 0).toBeLessThanOrEqual(4)
  })

  it('空字符串输入应回退', () => {
    const result = parseAIResponse('')
    expect(result.text).toBe('')
    expect(result.commands.emotion).toBe(DEFAULT_OUTPUT.emotion)
  })

  it('创造模式扩展字段不会被过滤', () => {
    const raw = JSON.stringify({
      text: '第一页写好了！',
      commands: {
        emotion: 'cheering',
        creation_page: '从前有一颗会发光的种子。',
        creation_title: '发光种子的冒险',
        creation_complete: true,
        illustration_prompt: '温暖水彩风的小花园和发光种子',
        creation_id: 'creation-1',
      },
    })

    const result = parseAIResponse(raw)

    expect(result.commands.creation_page).toBe('从前有一颗会发光的种子。')
    expect(result.commands.creation_title).toBe('发光种子的冒险')
    expect(result.commands.creation_complete).toBe(true)
    expect(result.commands.illustration_prompt).toBe('温暖水彩风的小花园和发光种子')
    expect(result.commands.creation_id).toBe('creation-1')
  })
})
