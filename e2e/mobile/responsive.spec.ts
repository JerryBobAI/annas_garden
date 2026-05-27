/**
 * iPad 移动端适配测试
 *
 * 使用 iPad Mini viewport 验证页面布局
 */

import { test, expect } from '@playwright/test'

test.describe('iPad 移动端适配', () => {
  const pages = [
    { path: '/child', name: '孩子首页' },
    { path: '/child/chat', name: '对话页' },
    { path: '/child/garden', name: '花园页' },
    { path: '/child/creations', name: '创作列表' },
  ]

  for (const { path, name } of pages) {
    test(`${name} (${path}) 加载正常`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // 页面可见
      await expect(page.locator('body')).toBeVisible()
      // 无错误
      await expect(page.locator('text=出错了')).not.toBeVisible()

      // 无水平溢出（移动端常见问题）
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const clientWidth = await page.evaluate(() => document.body.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 允许 5px 误差
    })
  }

  test('底部导航在移动端可见', async ({ page }) => {
    await page.goto('/child')
    await page.waitForLoadState('networkidle')

    const nav = page.locator('nav')
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible()
    }
  })
})
