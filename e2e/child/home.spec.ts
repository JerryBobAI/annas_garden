/**
 * 孩子端首页 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('孩子端首页', () => {
  test('页面可正常加载', async ({ page }) => {
    await page.goto('/child')
    await page.waitForLoadState('networkidle')

    // 页面标题或欢迎语
    await expect(page.locator('body')).toBeVisible()
    // 不应有错误页
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('显示学习模式入口', async ({ page }) => {
    await page.goto('/child')
    await page.waitForLoadState('networkidle')

    // 应该有对话/花园/创作等入口
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // 底部导航应该存在
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('可以导航到花园页', async ({ page }) => {
    await page.goto('/child/garden')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('可以导航到对话页', async ({ page }) => {
    await page.goto('/child/chat')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('可以导航到创作列表', async ({ page }) => {
    await page.goto('/child/creations')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })
})
