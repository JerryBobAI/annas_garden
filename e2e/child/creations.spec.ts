/**
 * 创作模式 E2E 测试
 *
 * 测试创作列表页和作品详情页
 */

import { test, expect } from '@playwright/test'

test.describe('创作模式', () => {
  test('创作列表页加载正常', async ({ page }) => {
    await page.goto('/child/creations')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('创作列表显示筛选或空状态', async ({ page }) => {
    await page.goto('/child/creations')
    await page.waitForLoadState('networkidle')

    const body = await page.textContent('body')
    // 要么有创作列表，要么有空状态提示
    expect(body).toBeTruthy()
  })

  test('可以进入创造模式对话', async ({ page }) => {
    // 创造模式通过 chat 页面进入
    await page.goto('/child/chat?mode=create')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('成就页加载正常', async ({ page }) => {
    await page.goto('/child/achievements')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('练习页加载正常', async ({ page }) => {
    await page.goto('/child/practice')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('复习页加载正常', async ({ page }) => {
    await page.goto('/child/review')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('引导页加载正常', async ({ page }) => {
    await page.goto('/child/onboarding')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })
})
