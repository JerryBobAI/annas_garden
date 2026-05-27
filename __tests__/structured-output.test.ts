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

  // ========== 以下为回归测试，防止再次改坏 ==========

  it('image_url 字段不会被过滤（图片持久化依赖）', () => {
    const raw = JSON.stringify({
      text: '这是一幅美丽的花园！',
      commands: {
        emotion: 'happy',
        image_url: 'data:image/png;base64,abc123',
        illustration_prompt: 'a beautiful garden',
      },
    })
    const result = parseAIResponse(raw)
    expect(result.text).toBe('这是一幅美丽的花园！')
    expect(result.commands.image_url).toBe('data:image/png;base64,abc123')
    expect(result.commands.illustration_prompt).toBe('a beautiful garden')
  })

  it('markdown ```json 包裹且含 emoji 和换行应正确解析', () => {
    // 这是 GLM 实际返回的格式，之前导致页面显示原始 JSON
    const raw = '```json\n{"text":"哇！你想画花园吗？🌸 猴子在树上摇晃尾巴？","commands":{"emotion":"happy","options":["画五颜六色的花朵 🌺","画高高的树 🌲"],"knowledge_tags":["monkey","tail"],"difficulty":1,"garden_event":"seed_planted","illustration_prompt":"A beautiful garden"}}\n```'
    const result = parseAIResponse(raw)
    expect(result.text).toBe('哇！你想画花园吗？🌸 猴子在树上摇晃尾巴？')
    expect(result.commands.emotion).toBe('happy')
    expect(result.commands.options).toHaveLength(2)
    expect(result.commands.garden_event).toBe('seed_planted')
  })

  it('JSON 中 text 含引号转义应正确提取', () => {
    const raw = JSON.stringify({
      text: '他说："你好！"这是个有趣的故事。',
      commands: { emotion: 'happy' },
    })
    const result = parseAIResponse(raw)
    expect(result.text).toBe('他说："你好！"这是个有趣的故事。')
  })

  it('JSON 中 text 含换行符应保留', () => {
    const raw = JSON.stringify({
      text: '第一行\n第二行\n第三行',
      commands: { emotion: 'thinking' },
    })
    const result = parseAIResponse(raw)
    expect(result.text).toBe('第一行\n第二行\n第三行')
    expect(result.commands.emotion).toBe('thinking')
  })

  it('深层嵌套的 markdown 代码块应正确解析', () => {
    // AI 有时会返回多余空格或不同的 json 标记
    const raw = '```json  \n  {"text":"测试","commands":{"emotion":"surprised"}}  \n```'
    const result = parseAIResponse(raw)
    expect(result.text).toBe('测试')
    expect(result.commands.emotion).toBe('surprised')
  })

  it('不完整 JSON（text 可提取但 commands 解析失败）应回退 commands', () => {
    // 模拟 AI 输出被截断的情况
    const raw = '{"text": "回答内容", "commands": {"emotion": "hap'
    const result = parseAIResponse(raw)
    expect(result.text).toBe('回答内容')
    expect(result.commands.emotion).toBe(DEFAULT_OUTPUT.emotion)
  })

  it('garden_event 为 null 时应保留', () => {
    const raw = JSON.stringify({
      text: '今天天气真好！',
      commands: { emotion: 'happy', garden_event: null },
    })
    const result = parseAIResponse(raw)
    expect(result.commands.garden_event).toBeNull()
  })

  it('difficulty 边界值验证（1和5合法，0和6非法）', () => {
    const valid1 = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', difficulty: 1 } }))
    const valid5 = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', difficulty: 5 } }))
    const invalid0 = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', difficulty: 0 } }))
    const invalid6 = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', difficulty: 6 } }))
    expect(valid1.commands.difficulty).toBe(1)
    expect(valid5.commands.difficulty).toBe(5)
    expect(invalid0.commands.difficulty).toBeUndefined()
    expect(invalid6.commands.difficulty).toBeUndefined()
  })

  it('BOM 字符开头的 JSON 应正确处理', () => {
    const raw = '\uFEFF{"text":"BOM测试","commands":{"emotion":"happy"}}'
    const result = parseAIResponse(raw)
    expect(result.text).toBe('BOM测试')
  })

  it('next_mode 合法值应保留，非法值应置 null', () => {
    const valid = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', next_mode: 'quest' } }))
    const invalid = parseAIResponse(JSON.stringify({ text: 't', commands: { emotion: 'happy', next_mode: 'invalid' } }))
    expect(valid.commands.next_mode).toBe('quest')
    expect(invalid.commands.next_mode).toBeNull()
  })
})
