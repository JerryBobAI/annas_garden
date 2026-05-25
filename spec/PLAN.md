# Anna's Garden - 开发计划 v2.0

> 最后更新：2026-05-25
>
> AI 原生儿童教育平台 — 从"做题器"到"AI 花园精灵陪伴学习"

## 进度概览

```
已完成（v1.0 做题器）:
  基础框架搭建       ████████████████████ 100% ✅
  数据层接入         ████████████████████ 100% ✅
  核心功能开发       ██████████████░░░░░░  70% ✅ (暂停，转入 v2.0)

v2.0 AI 原生转型:
  Phase 1: AI 对话核心 ████████████████████ 100% ✅ (2026-05-24)
  Phase 2: 语音 + 花园 ████████████████████ 100% ✅ (2026-05-25)
  Phase 3: 创造模式    ████████████████████ 100% ✅ (2026-05-25)
  Phase 4: 智能引擎    ░░░░░░░░░░░░░░░░░░░░  0% ← 下一步
```

---

## v1.0 已完成工作（保留）

以下工作在 v2.0 中继续保留和复用：

### 基础框架 ✅
- Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui
- 吉卜力治愈风格主题系统（OKLCH 色彩、毛玻璃、水彩纹理）
- TypeScript 类型定义（11 接口 + 10 枚举）
- Supabase 数据访问层 + Auth 认证 + 中间件
- 首页 + 家长端 7 页 + 孩子端 4 页

### 数据层 ✅
- 11 张数据库表 + 索引 + RLS + 自动触发器
- 种子数据（学期目标 + 示例题）
- 7 个 API 路由（materials, exercises, records, wrong-answers, goals, plans）

### 核心功能（70%）✅
- 家长端/孩子端全部接入 Supabase 真实数据
- 练习系统、错题本、学习记录、数据看板基础功能可用

### v1.0 遗留项（降优先级，按需在 v2.0 中处理）
- [ ] Supabase Storage 文件上传
- [ ] 多题型（判断题、填空题）
- [ ] 间隔复习算法
- [ ] 正确率趋势图
- [ ] PWA manifest 配置

---

## Phase 1: AI 对话核心 + 孩子端重写

> **目标**: 实现花园精灵 AI 对话，孩子可以和精灵文字聊天学习。这是整个 v2.0 的核心体验。

### 1.1 前置准备（融合原 Phase 0 技术债）

- [ ] **安装 AI 核心依赖**
  - `npm install ai openai` (Vercel AI SDK + OpenAI)
  - 配置 `OPENAI_API_KEY` 环境变量
  - 验证 API 连通性

- [ ] **数据库迁移 002: AI 对话表**
  ```
  创建顺序（按依赖关系）：
  1. conversations — AI 对话（依赖 profiles）
  2. messages — 对话消息（依赖 conversations）
  3. curiosity_seeds — 好奇心种子（依赖 profiles）
  4. cognitive_profiles — 认知档案（依赖 profiles）
  5. knowledge_mastery — 知识掌握（依赖 profiles）
  6. garden_plants — 花园植物（依赖 profiles, conversations）
  ```
  - 每张表配套 RLS 策略（孩子只能看自己的数据，家长可看孩子数据）
  - 新增 TypeScript 类型定义到 `types/index.ts`

- [ ] **孩子端独立布局**
  - 创建 `app/child/layout.tsx`（独立于家长端）
  - 底部固定导航栏（首页、学习、花园、成就、我的）
  - Error Boundary + Loading 状态

- [ ] **家长端独立布局**
  - 创建 `app/parent/layout.tsx`
  - Error Boundary + Loading 状态

### 1.2 AI 对话引擎

- [ ] **System Prompt 模块** (`lib/ai/prompts.ts`)
  - 花园精灵基础人设 prompt
  - 三种模式的 prompt 变体（explore / quest / create）
  - 安全规则 prompt（内容过滤、话题引导）

- [ ] **结构化输出解析** (`lib/ai/structured-output.ts`)
  - 解析 AI 回复中的 JSON 结构化指令
  - 提取 emotion、options、knowledge_tags、garden_event
  - 回退策略：如果解析失败，仅显示文字

- [ ] **Token 管理** (`lib/ai/token-manager.ts`)
  - 对话上下文 token 计数
  - 自动截断策略：保留 system prompt + 最近 N 条消息
  - 上下文窗口警告阈值

- [ ] **AI 对话 API 路由** (`app/api/ai/chat/route.ts`)
  - 使用 Vercel AI SDK `streamText()` 实现流式响应
  - 请求参数：conversation_id, message, mode
  - 自动保存对话记录到 conversations + messages 表
  - 错误处理：超时、rate limit、API 失败（参考 SPEC §8）

### 1.3 孩子端 UI 重写

- [ ] **孩子首页重构** (`app/child/page.tsx`)
  - 时段问候 + 精灵头像
  - 三模式入口卡片（探索 / 任务 / 创造）
  - 花园缩略预览
  - 今日学习统计

- [ ] **AI 对话界面** (`app/child/chat/page.tsx`) — 核心页面
  - 精灵头像 + 情绪状态组件 (`components/child/fairy-avatar.tsx`)
  - 对话气泡组件 (`components/child/chat-bubble.tsx`)
  - 选项按钮组件 (`components/child/option-buttons.tsx`)
  - 文字输入框 + 发送按钮
  - 流式响应显示（文字逐字出现）
  - AI "思考中" 加载动画

- [ ] **首次使用引导** (Onboarding)
  - 精灵自我介绍动画
  - 取名/选头像
  - 种下第一颗种子
  - 模式选择引导
  - 第一次 AI 对话

### 1.4 测试策略

- [ ] **测试基础设施**
  - 安装 Jest + React Testing Library
  - 安装 Playwright (E2E)
  - 配置测试脚本到 `package.json`

- [ ] **单元测试**
  - `lib/ai/structured-output.ts` — 结构化输出解析
  - `lib/ai/token-manager.ts` — Token 计数和截断
  - `lib/ai/prompts.ts` — Prompt 模板生成

- [ ] **集成测试**
  - `/api/ai/chat` — 流式响应、错误处理
  - 对话记录保存到数据库

- [ ] **E2E 测试**
  - 完整对话流程：发送消息 → 收到流式回复 → 选项按钮点击
  - Onboarding 流程

### Phase 1 交付标准
- ✅ 孩子可以和花园精灵进行文字对话
- ✅ AI 回复包含结构化指令（情绪、选项、知识标签）
- ✅ 三种模式可切换
- ✅ 对话历史持久化
- ✅ 错误处理完整（超时、断网、API 失败）
- ✅ Onboarding 流程可用
- ✅ 核心模块有单元测试

---

## Phase 2: 语音交互 + 基础花园

> **目标**: 加入语音输入/输出，让孩子可以"说话"学习。同时实现基础版花园可视化。

### 2.1 语音交互

- [ ] **前端录音组件** (`components/child/voice-button.tsx`)
  - 按住录音 / 松开发送
  - Web Audio API + MediaRecorder
  - 录音波形可视化
  - 录音时长限制（最长 60s）

- [ ] **语音识别 API** (`app/api/voice/stt/route.ts`)
  - 接收音频 blob → 发送到 Whisper API → 返回文字
  - 支持中英文
  - 错误处理：识别失败 → "没听清，再说一次？"

- [ ] **语音合成 API** (`app/api/voice/tts/route.ts`)
  - 接收文字 → 发送到 OpenAI TTS → 返回音频
  - 精灵专属语音（选择合适的 voice 参数）
  - 音频流式播放

- [ ] **对话界面集成**
  - 语音按钮集成到对话输入区
  - 语音 → 文字 → AI 回复 → 语音播放 完整链路
  - 每个环节的加载动画（参考 SPEC §4.3 延迟预算）

### 2.2 基础花园可视化

- [ ] **花园数据层**
  - GardenPlant CRUD API (`app/api/garden/route.ts`)
  - AI 对话中的 `garden_event` 触发植物状态变化
  - 植物成长逻辑：seed → sprout → growing → blooming

- [ ] **花园界面** (`app/child/garden/page.tsx` 重构)
  - 2D 插画风格花园画布
  - 植物组件 (`components/child/garden-plant.tsx`)
  - 植物成长动画（发芽、开花）
  - 点击植物查看关联知识
  - 学科进度可视化

- [ ] **花园与对话联动**
  - AI 对话中 `garden_event: "seed_planted"` → 花园新增种子
  - 知识掌握达标 → 植物升级
  - 视觉反馈：对话后跳转花园看到成长

### Phase 2 交付标准
- ✅ 孩子可以语音和精灵对话
- ✅ 精灵用语音回复
- ✅ 花园中有植物随学习成长
- ✅ 对话和花园成长联动
- ✅ 语音延迟在可接受范围内（<6s 全链路）

---

## Phase 3: 创造模式

> **目标**: 实现"创造"学习模式，让孩子通过 AI 辅助创作来学习。

### 3.1 故事创作模块

- [ ] **故事创作 prompt**
  - AI 引导孩子构思故事（角色、场景、情节）
  - 孩子说一段，AI 续一段
  - 自动提取语文知识点（词汇、句型）

- [ ] **故事展示界面**
  - 故事卡片（封面 + 标题 + 摘要）
  - 故事阅读模式
  - 故事收藏到花园

### 3.2 数学探索模块

- [ ] **数学探索 prompt**
  - AI 创设数学情境题
  - 互动式解题（AI 引导，孩子每一步参与）
  - 可视化数学概念（如用 emoji 表示加减法）

### 3.3 英语冒险模块

- [ ] **英语角色扮演 prompt**
  - AI 扮演英语对话伙伴（商店、学校等场景）
  - 简单英语对话（适合低年级）
  - 发音练习（语音输入 + AI 评价）

### Phase 3 交付标准
- ✅ 三种创造子模式可用（故事/数学/英语）
- ✅ 创作内容保存并关联知识点
- ✅ 创作活动触发花园成长

---

## Phase 4: 智能课程引擎 + 家长洞察

> **目标**: 实现智能学习路径推荐和家长端 AI 洞察面板。

### 4.1 智能课程引擎

- [ ] **认知档案更新**
  - 基于对话历史分析孩子的学习偏好
  - 自动更新 cognitive_profiles 表
  - 推荐下一步学习内容

- [ ] **知识图谱**
  - 知识点之间的关联关系
  - 薄弱知识点自动识别
  - 任务模式自动选题

- [ ] **自适应难度**
  - 根据 knowledge_mastery 调整题目难度
  - 连续答对提升，连续答错降低
  - 避免挫败感

### 4.2 家长端 AI 洞察

- [ ] **AI 学习报告** (`app/parent/dashboard/page.tsx` 重构)
  - 本周学习兴趣变化（AI 分析对话主题）
  - 知识掌握趋势（按学科、按知识点）
  - 对话摘要（模式分布、对话次数）
  - 花园成长报告
  - AI 建议（基于孩子表现的个性化建议）

- [ ] **家长内容导入增强**
  - 文本输入 + PDF 导入课程内容
  - AI 自动提取知识点
  - 关联到任务模式

### 4.3 花园世界增强

- [ ] **动态花园**
  - 更多植物种类和成长阶段
  - 可解锁的花园区域
  - 季节变化效果
  - 成就系统完善

### Phase 4 交付标准
- ✅ AI 能根据孩子表现推荐学习内容
- ✅ 家长看到 AI 生成的定性学习报告
- ✅ 花园有丰富的视觉表现

---

## 测试策略总览

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 单元测试 | Jest + React Testing Library | AI 模块、工具函数、组件 |
| 集成测试 | Jest + MSW (Mock Service Worker) | API 路由、数据库交互 |
| E2E 测试 | Playwright | 核心用户流程（对话、语音、花园） |
| 手动测试 | iPad Safari | 触摸交互、语音录制、响应式布局 |

---

## 技术架构图

```
┌─────────────────────────────────────────────────┐
│                    客户端                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 孩子端    │  │ 家长端    │  │ 首页      │      │
│  │ (重写)    │  │ (渐进改造) │  │          │      │
│  └─────┬────┘  └─────┬────┘  └──────────┘      │
│        │              │                          │
│  ┌─────┴──────────────┴────────────────────┐    │
│  │          Next.js App Router              │    │
│  │     Server Components + Client Components│    │
│  └─────────────────┬───────────────────────┘    │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│                API Routes                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ /api/ai/ │  │/api/voice│  │ /api/*   │      │
│  │ chat     │  │ stt, tts │  │ CRUD     │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
└───────┼──────────────┼─────────────┼────────────┘
        │              │             │
   ┌────┴────┐   ┌────┴────┐  ┌────┴────┐
   │ Vercel  │   │ OpenAI  │  │Supabase │
   │ AI SDK  │   │ Whisper │  │ DB+Auth │
   │ + GPT-4o│   │ + TTS   │  │+Storage │
   └─────────┘   └─────────┘  └─────────┘
```

---

## AI API 成本估算

| 服务 | 单价 | 预估用量/月 | 月费 |
|------|------|-----------|------|
| GPT-4o | $2.50/1M input, $10/1M output | ~500K tokens | ~$5 |
| Whisper | $0.006/分钟 | ~300 分钟 | ~$1.8 |
| TTS | $0.015/1K字符 | ~200K 字符 | ~$3 |
| **总计** | | | **~$10/月** |

> 注：基于单个孩子每日 20 分钟使用的估算。

---

## 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| Hydration warning | 忽略 | 浏览器扩展注入导致，非代码问题 |
| 缺少 Server Components | Phase 1 处理 | 现有页面多为 Client Components，重写时改进 |
| 缺少 Error Boundaries | Phase 1 处理 | 孩子端/家长端独立布局时添加 |
| 零测试覆盖 | Phase 1 处理 | 安装 Jest + Playwright，核心模块先覆盖 |

---

## GSTACK REVIEW LOG

**Reviewed**: 2026-05-24 | **Mode**: SELECTIVE EXPANSION

| Review | Key Decision |
|--------|-------------|
| CEO | 战略方向正确，Phase 0 融入 Phase 1 减少无价值交付 |
| Design | 补充对话UI/花园UI/空状态/Onboarding/动效规范到 SPEC |
| Eng | 补充AI依赖/迁移策略/测试/错误处理/延迟预算/环境变量 |

**Taste decisions**: Phase 0 融合(A) / 花园 Phase 2 提前(C) / Prompt 原则+示例(C)
**User challenge**: 不设 deadline，按节奏推进(C)
