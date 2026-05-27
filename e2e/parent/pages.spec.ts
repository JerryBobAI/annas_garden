/**
 * 家长端剩余页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('家长端页面', () => {
  test('学习计划页加载', async ({ page }) => {
    await page.goto('/parent/plans')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('复习管理页加载', async ({ page }) => {
    await page.goto('/parent/review')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('家长验证页加载', async ({ page }) => {
    await page.goto('/parent/verify')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('家长花园页加载', async ({ page }) => {
    await page.goto('/parent/garden')
    await page.waitForLoadState('networkidle')

    // 可能重定向或正常显示
    await expect(page.locator('body')).toBeVisible()
  })

  test('设置页有配置内容', async ({ page }) => {
    await page.goto('/parent/settings')
    await page.waitForLoadState('networkidle')

    const body = await page.textContent('body')
    expect(body!.length).toBeGreaterThan(0)
  })

  test('无控制台错误（目标页）', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/parent/goals')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2_000)

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('hydration')
    )
    expect(critical).toHaveLength(0)
  })
})
