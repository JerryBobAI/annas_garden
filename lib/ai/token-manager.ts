import { Message } from '@/types'

/**
 * 简易 token 估算（中文约 2 token/字，英文约 1.3 token/word）
 * 精确计数需要 tiktoken，但对我们的场景够用
 */
export function estimateTokens(text: string): number {
  // 中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  // 其他字符（英文、数字、标点）
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars * 2 + otherChars * 0.5)
}

/**
 * GPT-4o 上下文窗口配置
 */
const CONFIG = {
  maxContextTokens: 16000,           // 保守上限（GPT-4o 支持 128K，但控制成本）
  systemPromptReserve: 1500,         // system prompt 预留
  responseReserve: 1000,             // 回复预留
  minHistoryMessages: 4,             // 最少保留最近 4 条消息（2 轮对话）
}

/**
 * 截断历史消息以适应上下文窗口
 *
 * 策略：保留 system prompt + 最近 N 条消息
 * 从最早的消息开始删除，直到 token 总数在预算内
 */
export function truncateHistory(
  messages: Message[],
  systemPromptTokens: number
): Message[] {
  const budget = CONFIG.maxContextTokens - systemPromptTokens - CONFIG.responseReserve

  // 从最新消息开始累加，找到能放下的最多消息
  let totalTokens = 0
  let cutIndex = messages.length

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = messages[i].token_count || estimateTokens(messages[i].content)
    if (totalTokens + msgTokens > budget) {
      cutIndex = i + 1
      break
    }
    totalTokens += msgTokens
    cutIndex = i
  }

  // 保证最少保留 minHistoryMessages 条
  const minIndex = Math.max(0, messages.length - CONFIG.minHistoryMessages)
  cutIndex = Math.min(cutIndex, minIndex)

  return messages.slice(cutIndex)
}

/**
 * 检查是否接近 token 上限
 */
export function isNearTokenLimit(
  messages: Message[],
  systemPromptTokens: number
): boolean {
  const totalTokens = messages.reduce(
    (sum, m) => sum + (m.token_count || estimateTokens(m.content)),
    systemPromptTokens
  )
  return totalTokens > CONFIG.maxContextTokens * 0.8
}
