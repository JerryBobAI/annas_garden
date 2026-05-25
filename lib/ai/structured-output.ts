import { AIStructuredOutput } from '@/types'

/**
 * 默认结构化输出（解析失败时的回退）
 */
export const DEFAULT_OUTPUT: AIStructuredOutput = {
  emotion: 'happy',
  options: undefined,
  knowledge_tags: undefined,
  difficulty: undefined,
  garden_event: null,
  next_mode: null,
}

/**
 * 从 AI 的原始回复中解析结构化输出
 *
 * AI 应该返回 JSON 格式：{ text: "...", commands: { ... } }
 * 如果解析失败，text 使用原始内容，commands 使用默认值
 */
export function parseAIResponse(raw: string): {
  text: string
  commands: AIStructuredOutput
} {
  // 清理可能的隐藏字符（BOM、零宽字符等）
  const cleaned = raw.trim().replace(/^\uFEFF/, '')

  // 1. 先尝试直接 JSON 解析
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.text) {
      return {
        text: parsed.text,
        commands: parsed.commands ? validateCommands(parsed.commands) : DEFAULT_OUTPUT,
      }
    }
  } catch {
    // 继续尝试其他方式
  }

  // 2. 尝试从 markdown 代码块中提取 JSON
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim())
      if (parsed.text) {
        return {
          text: parsed.text,
          commands: parsed.commands ? validateCommands(parsed.commands) : DEFAULT_OUTPUT,
        }
      }
    } catch {
      // 继续回退
    }
  }

  // 3. 逐字符提取 text 字段（比正则更健壮，处理换行/emoji/特殊字符）
  if (cleaned.startsWith('{')) {
    const startMatch = cleaned.match(/"text"\s*:\s*"/)
    if (startMatch && startMatch.index !== undefined) {
      const textStart = startMatch.index + startMatch[0].length
      let extractedText = ''
      let i = textStart
      while (i < cleaned.length) {
        const ch = cleaned[i]
        if (ch === '\\' && i + 1 < cleaned.length) {
          const next = cleaned[i + 1]
          if (next === 'n') { extractedText += '\n'; i += 2; continue }
          if (next === '"') { extractedText += '"'; i += 2; continue }
          if (next === '\\') { extractedText += '\\'; i += 2; continue }
          if (next === '/') { extractedText += '/'; i += 2; continue }
          if (next === 't') { extractedText += '\t'; i += 2; continue }
          extractedText += next; i += 2; continue
        }
        if (ch === '"') break // text 字段结束
        extractedText += ch
        i++
      }

      if (extractedText) {
        // 尝试提取 commands
        let commands = DEFAULT_OUTPUT
        const cmdMatch = cleaned.match(/"commands"\s*:\s*(\{[\s\S]*\})\s*\}?\s*$/)
        if (cmdMatch) {
          try {
            commands = validateCommands(JSON.parse(cmdMatch[1]))
          } catch { /* 使用默认 */ }
        }
        return { text: extractedText, commands }
      }
    }
  }

  // 4. 回退：整段文字作为 text，使用默认 commands
  return {
    text: cleaned.replace(/```[\s\S]*?```/g, '').trim() || raw,
    commands: DEFAULT_OUTPUT,
  }
}

/**
 * 验证和清理 commands 对象
 */
function validateCommands(raw: Record<string, unknown>): AIStructuredOutput {
  const validEmotions = ['happy', 'thinking', 'surprised', 'cheering']
  const validEvents = ['seed_planted', 'sprout', 'bloom', null]
  const validModes = ['explore', 'quest', 'create', null]

  const result: AIStructuredOutput = {
    emotion: validEmotions.includes(raw.emotion as string)
      ? (raw.emotion as AIStructuredOutput['emotion'])
      : 'happy',
    options: Array.isArray(raw.options) && raw.options.length > 0
      ? raw.options.map(String).slice(0, 3)
      : undefined,
    knowledge_tags: Array.isArray(raw.knowledge_tags)
      ? raw.knowledge_tags.map(String)
      : undefined,
    difficulty: typeof raw.difficulty === 'number' && raw.difficulty >= 1 && raw.difficulty <= 5
      ? raw.difficulty
      : undefined,
    garden_event: validEvents.includes(raw.garden_event as string | null)
      ? (raw.garden_event as AIStructuredOutput['garden_event'])
      : null,
    next_mode: validModes.includes(raw.next_mode as string | null)
      ? (raw.next_mode as AIStructuredOutput['next_mode'])
      : null,
  }

  // Phase 3: 保留创造模式扩展字段
  if (typeof raw.creation_page === 'string' && raw.creation_page.trim()) {
    result.creation_page = raw.creation_page.trim()
  }
  if (typeof raw.creation_title === 'string' && raw.creation_title.trim()) {
    result.creation_title = raw.creation_title.trim()
  }
  if (typeof raw.creation_complete === 'boolean') {
    result.creation_complete = raw.creation_complete
  }
  if (typeof raw.illustration_prompt === 'string' && raw.illustration_prompt.trim()) {
    result.illustration_prompt = raw.illustration_prompt.trim()
  }
  if (typeof raw.creation_id === 'string' && raw.creation_id.trim()) {
    result.creation_id = raw.creation_id.trim()
  }

  return result
}
