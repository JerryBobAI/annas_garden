/**
 * 儿童内容安全：prompt 护栏的补充层（输入拦截 + 输出兜底）
 */

const INPUT_BLOCK_PATTERNS: RegExp[] = [
  /(?:我的|你家|住在|地址|电话|手机|微信|qq|QQ)[^\n]{0,20}(?:号|码|是)/i,
  /(?:自杀|自残|杀人|毒品|色情|裸体|赌博|枪械|炸弹)/,
  /(?:password|api[_-]?key|secret)/i,
  /(?:怎么\s*(?:伤害|杀死|欺负)|教我\s*(?:做坏事|骗人))/,
]

const OUTPUT_BLOCK_PATTERNS: RegExp[] = [
  /(?:自杀|自残|杀人|毒品|色情|裸体|政治|赌博|枪械|炸弹)/,
  /(?:我是\s*(?:AI|人工智能|大语言模型|ChatGPT|机器人))/i,
  /(?:你可以\s*(?:伤害|欺骗|隐瞒)父母)/,
]

export const SAFETY_FALLBACK_REPLY =
  '这个话题我们换个方向吧！你想去数字森林探险，还是继续我们的故事？🌱'

export const SAFETY_INPUT_REJECT =
  '这个问题精灵暂时不能聊哦，我们换个有趣的话题吧！'

export function isBlockedInput(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) return false
  return INPUT_BLOCK_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function sanitizeAssistantOutput(text: string): string {
  const normalized = text.trim()
  if (!normalized) return SAFETY_FALLBACK_REPLY
  if (OUTPUT_BLOCK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return SAFETY_FALLBACK_REPLY
  }
  return text
}

/** 从 AI JSON 回复中提取并净化 text 字段 */
export function sanitizeAiResponseRaw(raw: string): string {
  try {
    const parsed = JSON.parse(raw.trim())
    if (typeof parsed?.text === 'string') {
      parsed.text = sanitizeAssistantOutput(parsed.text)
      return JSON.stringify(parsed)
    }
  } catch {
    // 非 JSON 时按纯文本处理
  }
  return sanitizeAssistantOutput(raw)
}
