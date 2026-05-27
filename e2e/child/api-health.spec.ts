/**
 * API 健康检查 E2E 测试
 *
 * 验证各 API 端点在认证状态下可访问且不返回 500
 */

import { test, expect } from '@playwright/test'

test.describe('API 健康检查', () => {
  const getEndpoints = [
    '/api/garden',
    '/api/garden/stats',
    '/api/garden/areas',
    '/api/knowledge/graph',
    '/api/recommendations',
    '/api/reports',
    '/api/voice/provider',
    '/api/review/schedule',
  ]

  for (const endpoint of getEndpoints) {
    test(`GET ${endpoint} 不返回 500`, async ({ request }) => {
      const res = await request.get(endpoint)
      // 期望不是服务器错误（可能 200/401/403/404 都可以）
      expect(res.status()).not.toBe(500)
      expect(res.status()).toBeLessThan(500)
    })
  }

  test('POST /api/ai/chat 需要 body', async ({ request }) => {
    const res = await request.post('/api/ai/chat', {
      data: {},
    })
    // 应返回 400（参数错误）而非 500
    expect(res.status()).toBeLessThan(500)
  })

  test('POST /api/ai/image 需要 prompt', async ({ request }) => {
    const res = await request.post('/api/ai/image', {
      data: {},
    })
    // 应返回 400 而非 500
    expect(res.status()).toBeLessThan(500)
  })

  // 注意：POST /api/reports/generate 跳过测试
  // 该端点会实际调用 AI 生成报告，空 body 会导致超时，不适合 E2E 健康检查

  test('GET /api/wrong-answers 可访问', async ({ request }) => {
    const res = await request.get('/api/wrong-answers')
    expect(res.status()).toBeLessThan(500)
  })

  test('GET /api/conversations 可访问', async ({ request }) => {
    const res = await request.get('/api/conversations')
    expect(res.status()).toBeLessThan(500)
  })

  test('GET /api/creations 可访问', async ({ request }) => {
    const res = await request.get('/api/creations')
    expect(res.status()).toBeLessThan(500)
  })
})
