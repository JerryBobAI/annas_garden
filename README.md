# 🌻 Anna's Garden (安娜的花园)

> AI 原生儿童教育平台 — 通过 AI 花园精灵陪伴，让小朋友在花园世界中通过对话、语音和创造来快乐学习

## ✨ 核心特性

### 🤖 AI 花园精灵
- **AI 对话学习**：花园精灵是孩子的学习伙伴，不是老师
- **三种学习模式**：探索（好奇心驱动）、任务（学期大纲驱动）、创造（表达驱动）
- **语音 + 触摸并重**：孩子可以选择说话或点击
- **结构化 AI 输出**：情绪、选项、知识标签、花园事件

### 🌳 花园世界
- 学习 = 培育花园，每次学习让种子发芽、成长、开花
- 2D 插画风格花园可视化
- 植物成长与知识掌握联动
- 吉卜力治愈风格视觉设计

### 👨‍👩‍👧 家长功能
- **AI 学习洞察**：AI 生成的定性学习报告（不只是分数）
- **内容管理**：手动上传 + AI 识别 + 文本/PDF 导入
- **学期目标**：学科进度追踪
- **学习计划**：周视图

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
- **AI**：Vercel AI SDK + OpenAI (GPT-4o + Whisper + TTS)
- **PWA**：next-pwa（离线可选）

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
- `OPENAI_API_KEY` — OpenAI (GPT-4o + Whisper + TTS)

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 📋 开发状态

| Phase | 内容 | 状态 |
|-------|------|------|
| v1.0 | 基础框架 + 数据层 + 做题器核心功能 | ✅ 完成 (70%) |
| Phase 1 | AI 对话核心 + 孩子端重写 | ← 下一步 |
| Phase 2 | 语音交互 + 基础花园可视化 | 待开始 |
| Phase 3 | 创造模式（故事/数学/英语） | 待开始 |
| Phase 4 | 智能课程引擎 + 家长 AI 洞察 | 待开始 |

## 📄 文档

| 文档 | 说明 |
|------|------|
| `spec/SPEC.md` | 产品规格说明书 v2.0 |
| `spec/PLAN.md` | 开发计划 v2.0 |
| `spec/PHASE1-SPEC.md` | Phase 1 实施规格 — AI 对话核心 + 孩子端重写 |
| `spec/PHASE2-SPEC.md` | Phase 2 实施规格 — 语音交互 + 基础花园 |
| `spec/PHASE3-SPEC.md` | Phase 3 实施规格 — 创造模式 |
| `spec/PHASE4-SPEC.md` | Phase 4 实施规格 — 智能课程引擎 + 家长洞察 |
| `doc/VISION.md` | 产品愿景 |
| `doc/ROADMAP.md` | 技术路线图 |
| `doc/ISSUES.md` | 问题清单 + 决策记录 |

---

**让学习像花园一样成长 🌻**
