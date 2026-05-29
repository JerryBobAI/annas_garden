# MVP 试用 Playbook

> 最后更新：2026-05-29  
> 状态：**开放注册** + 内测验证

---

## 一句话

Anna's Garden 面向 **公开注册家庭** 的 MVP 试用，验证「AI 学伴 + 花园激励 + 家长洞察」是否比刷题 App 更让孩子愿意学。

---

## 试用范围

### ✅ 包含

| 能力 | 说明 |
|------|------|
| AI 对话 | 探索 / 任务 / 创造 三模式，三学科 |
| 语音交互 | 浏览器内置（零成本）或 SiliconFlow |
| 花园可视化 | 学习 → 植物生长 → 开花 |
| 创造保存 | 故事 / 数学 / 英语创作 |
| 家长区 | PIN 保护、AI 周报、PDF/文本导入 |
| 安全兜底 | Prompt 护栏 + 输入拦截 + 输出净化 + API 限流 |
| **公开注册** | Landing → `/auth/login?mode=signup` |
| **家长 PIN** | 每账户独立 4–6 位 PIN（哈希存库）；env `PARENT_ACCESS_PIN` 仅过渡兜底 |
| **图片永久存储** | Supabase Storage `illustrations` bucket |
| **离线 PWA** | Service Worker 缓存静态资源 + `/offline` 兜底页 |

### ❌ 暂不包含

| 能力 | 原因 |
|------|------|
| 第三方 Moderation API | MVP 用规则兜底，V1.0 补 |
| 多孩子账号 | 单账号模型 |
| 邀请码门槛 | 已选择公开注册（见下方说明） |

---

## 关于「共享 Supabase 项目，需 invite 控制」

这是 **MVP 文档里的运营建议**，不是代码里已有的邀请码功能。

含义是：

1. **共享 Supabase 项目**：开发、试用、早期生产往往共用 **同一个** Supabase Project（同一套数据库、Auth、Storage、同一组服务端 API Key）。
2. **风险**：若 signup 完全公开，陌生人也能注册 → 占用 Free 配额（500MB DB、1GB Storage）、刷你的 AI 图片/对话 API（**直接产生费用**）、写入测试数据污染环境。
3. **invite 控制**：用邀请码 / waitlist / 手动开白名单，限制「谁能注册」，把试用规模控在可承受范围内。

**当前决策**：选择 **公开大规模注册**，依赖 **API 限流 + Supabase 配额监控 + 必要时升级 Pro** 来扛量；不再把 invite 作为产品门槛。若日后被刷或成本失控，可再加 `INVITE_CODE` 环境变量门槛（可选增强，非 MVP 必需）。

---

## 试用流程

1. **访问** 生产域名 `/`（宣发 Landing）
2. **注册** `/auth/login?mode=signup` → 建议 Supabase **关闭** email confirmation（见下方运维）
3. **孩子 onboarding** 首次进入 `/child/onboarding`
4. **日常使用** 对话 → 花园 → 创造；家长长按精灵头像 3 秒 + PIN 进入家长区
5. **反馈** 见下方「反馈渠道」

---

## 环境要求

| 项 | 要求 |
|----|------|
| 设备 | iPad / 平板优先，竖屏 |
| 浏览器 | Safari / Chrome 最新版 |
| 网络 | 需访问 Supabase + GLM API（离线仅壳层/静态资源） |
| 语音 | 麦克风权限；推荐 SiliconFlow 提升中文识别 |

---

## 已知限制

- AI 回复非流式逐字（限流兼容设计，一次性返回）
- 进程内限流：Vercel 多实例下不共享（公开注册流量增大后考虑 Redis/Upstash）
- **离线 PWA**：可打开已缓存页面壳，**不能**离线对话/生图
- E2E 不覆盖真实 AI 对话质量
- Storage 迁移 `007_storage_illustrations.sql` 需在 Supabase 执行；未执行时插图回退临时 URL

---

## 成功指标（试用 2 周）

| 指标 | 目标 |
|------|------|
| 孩子单次会话时长 | ≥ 5 分钟 |
| 每周主动 explore | ≥ 3 次 |
| 家长每周看报告 | ≥ 1 次 |
| 定性反馈 | 「Anna 愿意再来」 |

---

## 反馈渠道

- GitHub Issues（项目仓库）
- 或直接联系产品负责人

反馈请包含：设备、浏览器、复现步骤、截图/录屏。

---

## 运维 Checklist（每次发版前）

- [ ] `npm test` 全绿
- [ ] `npm run lint` 0 error
- [ ] `npm run build` 通过
- [ ] `npx playwright test` smoke 通过
- [ ] `.env.local` / Vercel 环境变量完整（`PARENT_ACCESS_PIN` 可选）
- [ ] Supabase 迁移已应用（含 `007_storage_illustrations.sql`、`008_parent_pin_hash.sql`）
- [ ] 家长 PIN：新用户首次进 `/parent` 会引导设置家庭专属 PIN（`PARENT_ACCESS_PIN` 仅作未设置前的过渡兜底）
- [ ] Supabase Auth：Confirm email 按你的策略配置（当前为**开启**）
- [ ] Supabase Dashboard 监控：MAU、DB 体积、Storage、Egress

---

## Supabase 公开注册推荐设置

1. **Authentication → Providers → Email**：开启 Email，**关闭 Confirm email**
2. **Authentication → URL Configuration**：Site URL = 生产域名；Redirect URLs 含 `https://你的域名/**`
3. **Storage**：确认 `illustrations` bucket 存在且策略已应用
4. 配额接近上限时：删测试账号 / 升级 Pro / 或临时加注册门槛

---

## 下一步（可选）

1. Upstash Redis 全局限流（多实例 Vercel）
2. 第三方 Moderation API
3. 家长首次 onboarding 向导强化
