/**
 * 未登录重定向测试
 *
 * 验证：未登录用户访问受保护页面时被重定向到登录页
 * 注意：此测试不使用已保存的 auth 状态
 */

import { test, expect } from '@playwright/test'

// 覆盖 storageState，使用空白状态（未登录）
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('未登录访问保护', () => {
  const protectedPages = [
    '/child',
    '/child/chat',
    '/child/garden',
    '/child/creations',
    '/child/achievements',
    '/child/practice',
    '/child/review',
    '/parent/dashboard',
    '/parent/goals',
    '/parent/settings',
    '/parent/content',
    '/parent/plans',
  ]

  for (const path of protectedPages) {
    test(`${path} 未登录应重定向`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // 应被重定向到登录页或显示登录引导
      const url = page.url()
      const isOnLogin = url.includes('/auth/login')
      const isOnHome = url.endsWith(':3000/') || url.endsWith(':3000')
      const hasLoginPrompt = await page.locator('text=登录').count() > 0

      expect(isOnLogin || isOnHome || hasLoginPrompt).toBeTruthy()
    })
  }

  test('登录页本身可正常访问', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // 应该有登录表单
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('首页可正常访问', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
  })
})
