import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

// 加载 .env.local 环境变量
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * Playwright E2E 测试配置
 *
 * 使用 .env.local 中的 E2E_TEST_EMAIL / E2E_TEST_PASSWORD 做登录
 * 测试目标：本地 dev server (localhost:3000)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,           // 顺序执行，避免登录状态冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                     // 单 worker，共享登录状态
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 登录状态准备（auth setup）
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // 孩子端测试
    {
      name: 'child',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/child.json',
      },
      dependencies: ['setup'],
      testMatch: /child\/.*\.spec\.ts/,
    },
    // 家长端测试
    {
      name: 'parent',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/parent.json',
      },
      dependencies: ['setup'],
      testMatch: /parent\/.*\.spec\.ts/,
    },
    // iPad 移动端测试
    {
      name: 'mobile',
      use: {
        ...devices['iPad Mini'],
        storageState: 'e2e/.auth/child.json',
      },
      dependencies: ['setup'],
      testMatch: /mobile\/.*\.spec\.ts/,
    },
  ],
  // 自动启动 dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
