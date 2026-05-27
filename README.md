# 🌻 Anna's Garden (安娜的花园)

> AI 原生儿童教育平台 — 通过 AI 花园精灵陪伴，让小朋友在花园世界中通过对话、语音和创造来快乐学习

## ✨ 核心特性

### 🤖 AI 花园精灵
- **动态 SVG 角色**：精灵有呼吸、眨眼、腮红动画，随情绪变化表情
- **AI 对话学习**：花园精灵是孩子的学习伙伴，不是老师
- **三种学习模式**：探索（好奇心驱动）、任务（学期大纲驱动）、创造（表达驱动）
- **语音 + 触摸并重**：孩子可以选择说话或点击
- **结构化 AI 输出**：情绪、选项、知识标签、花园事件
- **艾宾浩斯复习**：遗忘曲线自动检测，精灵在对话中自然引导复习
- **AI 图片生成**：对话中自动生成教学插图（SeedDance / LabNana / CogView / DALL-E，通过 `IMAGE_PROVIDER` 切换）

### 🌳 花园世界
- 学习 = 培育花园，每次学习让种子发芽、成长、开花
- 2D 插画风格花园可视化
- 植物成长与知识掌握联动
- 吉卜力治愈风格视觉设计

### 👨‍👩‍👧 家长功能
- **AI 学习洞察**：AI 生成的定性学习报告（不只是分数）
- **家长中心实时面板**：本周对话、花园植物、待审核、AI 快报摘要
- **内容管理**：手动上传 + AI 识别 + 文本/PDF 导入（`/parent/content/import`）
- **学期目标**：学科进度 + 知识点掌握度进度条
- **学习计划**：周视图 + AI 推荐补充任务
- **系统设置**：认知档案、JSON 数据导出、AI 配置状态

### 👧 孩子体验
- **AI 对话界面**：和花园精灵自由对话学习
- **语音交互**：按住说话，精灵用语音回复
- **花园成长**：学习活动让花园植物成长
- **首次引导**：精灵自我介绍 → 种第一颗种子 → 开始对话

### 📚 三大学科
- **语文**：看图讲故事、拼音对话练习、创意写话引导
- **数学**：情境化题目、数学探索对话
- **英语**：角色扮演、发音对话练习、英语冒险故事

## 🛠️ 技术栈

- **前端框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS v4 + shadcn/ui
- **后端**：Supabase (PostgreSQL + Auth + Storage)
- **AI**：Vercel AI SDK + 智谱 GLM-4（默认） / OpenAI GPT-4o（可切换）
- **PWA**：Web App Manifest + apple-web-app（iPad 添加到主屏幕）

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 配置环境变量
```bash
cp .env.local.example .env.local
```

需要配置：
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `GLM_API_KEY` / `GLM_BASE_URL` — 智谱 GLM（默认 AI 提供商，open.bigmodel.cn）
- `VOICE_PROVIDER` — 语音方案：`browser`（零成本） / `siliconflow`（推荐） / `openai`
- `SILICONFLOW_API_KEY` — 硅基流动（免费注册 siliconflow.cn，推荐）
- `OPENAI_API_KEY` — OpenAI（可选，付费但质量最高）
- `LABNANA_API_KEY` — LabNana 图片生成（推荐，高质量文生图）
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` — 自动化测试账号（可选）

> 💡 **语音零成本方案**：不配任何 API Key 时自动使用浏览器内置语音（Web Speech API），完全免费。

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 🧪 测试

### 单元测试（Jest）

```bash
npm test              # 运行 188 个单元测试
npm run test:watch    # watch 模式
```

### E2E 测试（Playwright）

```bash
npm run test:e2e      # 运行 68 个 E2E 测试（自动启动 dev server）
npm run test:e2e:ui   # 可视化调试模式
```

> E2E 测试覆盖：登录认证、孩子端全页面、家长端全页面、AI 对话交互、API 健康检查、未登录重定向保护、iPad 移动端适配。需要 `.env.local` 中有 `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`。

### CI

推送到 `main` 或发起 PR 时自动触发 GitHub Actions E2E 测试（`.github/workflows/e2e.yml`）。

## 📋 开发状态

| Phase | 内容 | 状态 |
|-------|------|------|
| v1.0 | 基础框架 + 数据层 + 做题器核心功能 | ✅ 完成 |
| Phase 1 | AI 对话核心 + 孩子端重写 + 测试 | ✅ 完成 |
| Phase 2 | 语音交互 + 基础花园可视化 | ✅ 完成 |
| Phase 3 | 创造模式（故事/数学/英语） | ✅ 完成 |
| Phase 4 | 智能课程引擎 + 家长 AI 洞察 | ✅ 完成 |
| 体验打磨 | SSR 重构 + PWA + zod 校验 + StrictMode | ✅ 完成 |
| 迭代增强 | 精灵动态头像 + 复习调度 + 图片生成 + RLS 收紧 | ✅ 完成 |

## 📄 文档

| 文档 | 说明 |
|------|------|
| `spec/SPEC.md` | 产品规格说明书 v2.0 |
| `spec/PLAN.md` | 开发计划 v2.0 |
| `spec/PHASE1.md` | Phase 1 — AI 对话核心 + 孩子端重写 |
| `spec/PHASE2.md` | Phase 2 — 语音交互 + 基础花园 |
| `spec/PHASE3.md` | Phase 3 — 创造模式 |
| `spec/PHASE4.md` | Phase 4 — 智能课程引擎 + 家长洞察 |
| `doc/VISION.md` | 产品愿景 |
| `doc/ROADMAP.md` | 技术路线图 |
| `doc/ISSUES.md` | 问题清单 + 决策记录 |

---

**让学习像花园一样成长 🌻**
