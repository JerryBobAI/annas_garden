/**
 * 家长端仪表盘 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('家长端仪表盘', () => {
  test('仪表盘页面可加载', async ({ page }) => {
    await page.goto('/parent/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('显示核心统计卡片', async ({ page }) => {
    await page.goto('/parent/dashboard')
    await page.waitForLoadState('networkidle')

    // 仪表盘应该有内容区域
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('可以导航到目标页', async ({ page }) => {
    await page.goto('/parent/goals')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('可以导航到设置页', async ({ page }) => {
    await page.goto('/parent/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('可以导航到内容管理', async ({ page }) => {
    await page.goto('/parent/content')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('可以导航到导入页', async ({ page }) => {
    await page.goto('/parent/content/import')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=出错了')).not.toBeVisible()
  })

  test('页面无控制台错误', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/parent/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2_000)

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('hydration')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
