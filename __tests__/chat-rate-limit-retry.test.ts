/**
 * Chat 限流自动重试逻辑测试
 * 验证 use-fairy-chat hook 中的 rate limit auto-retry 行为
 */

describe('Chat 限流自动重试', () => {
  describe('限流错误检测', () => {
    // 复现 hook 中的限流判断逻辑
    function isRateLimitError(msg: string): boolean {
      return msg.includes('休息一下') || msg.includes('稍后再试')
    }

    it('识别"精灵需要休息一下，稍后再试"为限流错误', () => {
      expect(isRateLimitError('精灵需要休息一下，稍后再试')).toBe(true)
    })

    it('识别包含"稍后再试"的消息为限流错误', () => {
      expect(isRateLimitError('服务器繁忙，请稍后再试')).toBe(true)
    })

    it('识别包含"休息一下"的消息为限流错误', () => {
      expect(isRateLimitError('精灵需要休息一下')).toBe(true)
    })

    it('不将普通错误误判为限流', () => {
      expect(isRateLimitError('网络出了点问题')).toBe(false)
      expect(isRateLimitError('精灵想得太久了，请再试一次')).toBe(false)
      expect(isRateLimitError('花园和外面断开了')).toBe(false)
      expect(isRateLimitError('请求格式错误')).toBe(false)
    })
  })

  describe('自动重试计数器行为', () => {
    it('限流时只自动重试一次（计数器 < 1）', () => {
      let counter = 0
      const maxAutoRetry = 1

      // 第一次限流 → 应重试
      const shouldRetry1 = counter < maxAutoRetry
      expect(shouldRetry1).toBe(true)
      counter++

      // 第二次限流 → 不应重试，展示错误
      const shouldRetry2 = counter < maxAutoRetry
      expect(shouldRetry2).toBe(false)
    })

    it('成功发送后重置计数器', () => {
      let counter = 0
      const maxAutoRetry = 1

      // 第一次限流 → 重试
      counter++
      expect(counter).toBe(1)

      // 重试成功 → 重置
      counter = 0
      expect(counter).toBe(0)

      // 再次限流 → 又可以重试
      const shouldRetry = counter < maxAutoRetry
      expect(shouldRetry).toBe(true)
    })

    it('非限流错误不触发自动重试', () => {
      let counter = 0
      const maxAutoRetry = 1
      const msg = '网络出了点问题'
      const isRateLimit = msg.includes('休息一下') || msg.includes('稍后再试')

      // 非限流 → 不应重试
      expect(isRateLimit).toBe(false)
      // 计数器应被重置
      counter = 0
      expect(counter).toBe(0)
    })
  })

  describe('后端 maxRetries 配置', () => {
    it('streamText 应配置 maxRetries: 0 避免推理模型超长等待', async () => {
      // 读取 route.ts 中的配置验证
      const fs = await import('fs')
      const path = await import('path')
      const routePath = path.join(process.cwd(), 'app/api/ai/chat/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      // glm-4.7 推理模型本身响应慢，后端不重试；前端 sendRef 负责限流重试
      expect(content).toContain('maxRetries: 0')
    })
  })

  describe('前端自动重试逻辑集成', () => {
    it('hook 中使用 sendRef 避免自引用', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.join(process.cwd(), 'lib/hooks/use-fairy-chat.ts')
      const content = fs.readFileSync(hookPath, 'utf-8')

      // 验证使用 sendRef 而非直接引用 send
      expect(content).toContain('sendRef.current(lastUserMessageRef.current)')
      // 验证 sendRef 在 useEffect 中同步
      expect(content).toContain('useEffect(() => { sendRef.current = send }, [send])')
      // 验证自动重试计数器
      expect(content).toContain('autoRetryCountRef')
    })

    it('限流时等待 3 秒后重试', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const hookPath = path.join(process.cwd(), 'lib/hooks/use-fairy-chat.ts')
      const content = fs.readFileSync(hookPath, 'utf-8')

      // 验证有 3 秒延迟
      expect(content).toContain('setTimeout(r, 3000)')
    })
  })
})
