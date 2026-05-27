/**
 * Playwright Auth Setup
 *
 * 登录测试账号并保存认证状态，后续测试复用
 * 需要 .env.local 中配置 E2E_TEST_EMAIL / E2E_TEST_PASSWORD
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const CHILD_AUTH = path.join(__dirname, '.auth/child.json')
const PARENT_AUTH = path.join(__dirname, '.auth/parent.json')

/**
 * 通用登录流程
 */
async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  // 填写登录表单
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // 点击登录按钮
  await page.click('button[type="submit"]')

  // 等待跳转离开登录页
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 })
}

// 孩子端登录
setup('authenticate as child', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error('缺少 E2E_TEST_EMAIL / E2E_TEST_PASSWORD 环境变量')
  }

  await loginAs(page, email, password)

  // 确认进入孩子端
  await expect(page).toHaveURL(/\/child/)

  // 保存认证状态
  await page.context().storageState({ path: CHILD_AUTH })
})

// 家长端登录（使用同一账号，通过导航切换）
setup('authenticate as parent', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error('缺少 E2E_TEST_EMAIL / E2E_TEST_PASSWORD 环境变量')
  }

  await loginAs(page, email, password)

  // 导航到家长端
  await page.goto('/parent/dashboard')
  await page.waitForLoadState('networkidle')

  // 保存认证状态
  await page.context().storageState({ path: PARENT_AUTH })
})
