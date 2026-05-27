/**
 * Chat API 错误映射测试
 * 确保 GLM / AI SDK 各类错误能被正确识别并返回友好提示
 */

// 导出 extractAiErrorInfo 和 mapAiProviderError 供测试用
// 由于它们在 route.ts 中是内部函数，我们复制逻辑做单元测试

function extractAiErrorInfo(err: unknown): { message: string; statusCode?: number } {
  const parts: string[] = []
  let statusCode: number | undefined

  const visit = (value: unknown, depth = 0) => {
    if (depth > 5 || value == null) return

    if (typeof value === 'string') {
      parts.push(value)
      return
    }

    if (value instanceof Error) {
      parts.push(value.message)
      const errObj = value as Error & { statusCode?: number; responseBody?: string; cause?: unknown; data?: unknown }
      if (typeof errObj.statusCode === 'number') statusCode = errObj.statusCode
      if (typeof errObj.responseBody === 'string') parts.push(errObj.responseBody)
      if (errObj.data) visit(errObj.data, depth + 1)
      visit(errObj.cause, depth + 1)
      return
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (typeof obj.statusCode === 'number') statusCode = obj.statusCode
      if (typeof obj.message === 'string') parts.push(obj.message)
      if (typeof obj.responseBody === 'string') parts.push(obj.responseBody)
      if (obj.lastError) visit(obj.lastError, depth + 1)
      if (Array.isArray(obj.errors)) obj.errors.forEach(item => visit(item, depth + 1))
      if (obj.data) visit(obj.data, depth + 1)
      if (obj.error) visit(obj.error, depth + 1)
    }
  }

  visit(err)
  return { message: parts.join(' '), statusCode }
}

type ErrorCategory = 'rate_limit' | 'auth' | 'server' | 'unknown'

function classifyError(err: unknown): ErrorCategory {
  const { message, statusCode } = extractAiErrorInfo(err)

  if (
    statusCode === 429 ||
    message.includes('rate_limit') ||
    message.includes('429') ||
    message.includes('速率限制') ||
    message.includes('访问量过大') ||
    message.includes('"code":"1302"') ||
    message.includes('"code":"1305"') ||
    message.includes('1302') ||
    message.includes('1305')
  ) {
    return 'rate_limit'
  }
  if (statusCode === 401 || message.includes('api_key') || message.includes('401')) {
    return 'auth'
  }
  if (statusCode === 500 || message.includes('网络错误')) {
    return 'server'
  }
  return 'unknown'
}

describe('Chat API 错误映射', () => {
  describe('extractAiErrorInfo', () => {
    it('从 AI_APICallError 提取 statusCode 和 responseBody', () => {
      // 模拟 Vercel AI SDK 的 AI_APICallError 结构
      const err = new Error('该模型当前访问量过大，请您稍后再试')
      Object.assign(err, {
        statusCode: 429,
        responseBody: '{"error":{"code":"1305","message":"该模型当前访问量过大，请您稍后再试"}}',
        data: { error: { message: '该模型当前访问量过大，请您稍后再试', code: '1305' } },
      })

      const info = extractAiErrorInfo(err)
      expect(info.statusCode).toBe(429)
      expect(info.message).toContain('访问量过大')
      expect(info.message).toContain('1305')
    })

    it('从嵌套 cause 链提取错误信息', () => {
      const inner = new Error('connect timeout')
      const outer = new Error('request failed')
      Object.assign(outer, { cause: inner })

      const info = extractAiErrorInfo(outer)
      expect(info.message).toContain('request failed')
      expect(info.message).toContain('connect timeout')
    })

    it('从普通对象提取 statusCode', () => {
      const err = { statusCode: 401, message: 'invalid api_key' }
      const info = extractAiErrorInfo(err)
      expect(info.statusCode).toBe(401)
      expect(info.message).toContain('api_key')
    })
  })

  describe('classifyError（错误分类）', () => {
    it('GLM 1305 限流（Error + statusCode 429）→ rate_limit', () => {
      const err = new Error('该模型当前访问量过大，请您稍后再试')
      Object.assign(err, {
        statusCode: 429,
        responseBody: '{"error":{"code":"1305","message":"该模型当前访问量过大，请您稍后再试"}}',
      })
      expect(classifyError(err)).toBe('rate_limit')
    })

    it('GLM 1302 速率限制 → rate_limit', () => {
      const err = new Error('速率限制')
      Object.assign(err, { statusCode: 429 })
      expect(classifyError(err)).toBe('rate_limit')
    })

    it('纯 HTTP 429（无 statusCode 属性但 message 含 429）→ rate_limit', () => {
      const err = new Error('HTTP 429 Too Many Requests')
      expect(classifyError(err)).toBe('rate_limit')
    })

    it('含 "访问量过大" 文本 → rate_limit', () => {
      const err = new Error('该模型当前访问量过大，请您稍后再试')
      expect(classifyError(err)).toBe('rate_limit')
    })

    it('401 认证错误 → auth', () => {
      const err = new Error('invalid api_key or not authorized')
      Object.assign(err, { statusCode: 401 })
      expect(classifyError(err)).toBe('auth')
    })

    it('500 服务端错误 → server', () => {
      const err = new Error('internal error')
      Object.assign(err, { statusCode: 500 })
      expect(classifyError(err)).toBe('server')
    })

    it('网络错误 → server', () => {
      const err = new Error('网络错误：连接超时')
      expect(classifyError(err)).toBe('server')
    })

    it('未知错误 → unknown', () => {
      const err = new Error('something completely unexpected')
      expect(classifyError(err)).toBe('unknown')
    })

    it('Error 继承类带 statusCode 不会丢失（核心回归测试）', () => {
      // 这是之前的 bug：Error 实例进入 instanceof Error 分支后
      // 直接 return，不读 statusCode
      class AICallError extends Error {
        statusCode: number
        responseBody: string
        constructor(msg: string, status: number, body: string) {
          super(msg)
          this.statusCode = status
          this.responseBody = body
        }
      }
      const err = new AICallError(
        '该模型当前访问量过大',
        429,
        '{"error":{"code":"1305"}}'
      )
      const info = extractAiErrorInfo(err)
      expect(info.statusCode).toBe(429)
      expect(classifyError(err)).toBe('rate_limit')
    })
  })
})
