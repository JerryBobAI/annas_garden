# Anna's Garden (安娜的花园) - 产品规格说明书

> 治愈风格的儿童学习网站，围绕学期目标，陪伴孩子快乐成长

## 1. 项目概述

### 1.1 目标用户

- **主要用户**：一年级（下学期）小学生 Anna
- **管理用户**：家长（内容录入、进度管理、学习规划）
- **设备**：iPad 为主，兼顾电脑浏览器

### 1.2 核心定位

围绕一年级下学期学习目标，通过治愈风格的互动体验，让学习变得温暖有趣。不是替代学校教育，而是辅助巩固和练习。

### 1.3 学科范围

| 学科 | 重点内容（来自家长会） |
|------|----------------------|
| 语文 | 识字写字、朗读、阅读理解、看图写话 |
| 数学 | 20以内退位减法、认识图形、100以内数的认识、口算、解决问题、课外阅读 |
| 英语 | 英文歌谣、自然拼读(Phonics)、课本内容、绘本阅读 |

---

## 2. 视觉设计规范

### 2.1 设计风格

吉卜力/治愈物语风格，温暖自然的视觉体验。

### 2.2 字体

```css
font-family: 'Open Sans', 'Noto Sans SC', sans-serif;
```

- **Open Sans**：西文字体，清晰友好
- **Noto Sans SC**：中文字体，Google 开源，覆盖全字符集
- 超大标题使用 `font-weight: 900`（Noto Sans SC Black）

### 2.3 色彩体系

| 用途 | 色值 | 说明 |
|------|------|------|
| 主背景 | `#FDF6E3` | 吉卜力米白 |
| 主文字 | `#3A2E2C` | 深棕，温暖不刺眼 |
| 辅助文字 | `#5D4E4A` | 浅棕 |
| 说明文字 | `#8B7355` | 墨绿偏棕 |
| 强调色 | `#FFB300` | 琥珀黄，按钮和高亮（无 text-shadow） |
| 卡片背景 | `rgba(255,255,255,0.75)` | 半透明白色 |
| 卡片变体A | `rgba(224,242,247,0.75)` | 淡天蓝色半透明 |
| 卡片变体B | `rgba(206,229,234,0.8)` | 稍深淡天蓝色 |
| 成功色 | `#7CB342` | 柔绿 |
| 错误色 | - | 柔红，不刺眼 |

**禁忌**：不使用纯黑(#000)和纯白(#fff)，不用冷色调，不使用深色模式，高亮文字不加 text-shadow。

### 2.4 背景纹理

```css
/* 主背景 + 细微对角线编织纹理 */
background-color: #FDF6E3;
background-image:
  linear-gradient(45deg, rgba(210,180,140,0.03) 25%, transparent 25%),
  linear-gradient(-45deg, rgba(210,180,140,0.03) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, rgba(210,180,140,0.03) 75%),
  linear-gradient(-45deg, transparent 75%, rgba(210,180,140,0.03) 75%);
background-size: 20px 20px;
```

### 2.5 UI 组件规范

#### 卡片 (.card)
```css
background: rgba(255, 255, 255, 0.75);
backdrop-filter: blur(12px);
border-radius: 1.5rem;          /* 苹果风格圆角 */
box-shadow:
  0 10px 25px rgba(0,0,0,0.05),
  0 4px 10px rgba(0,0,0,0.03);
padding: 1.5rem;
transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
overflow: hidden;               /* 光晕效果需要 */
```

#### 卡片悬停 (.card:hover)
```css
transform: translateY(-5px);
box-shadow:
  0 20px 35px rgba(0,0,0,0.08),
  0 8px 15px rgba(0,0,0,0.05);
```

#### 琥珀光晕 (.tech-glow::before)
```css
/* 卡片内背景光晕，琥珀色径向渐变 */
position: absolute; top: 50%; left: 50%;
width: 250%; height: 250%;
background-image: radial-gradient(circle,
  rgba(255,179,0,0.15) 0%,
  rgba(255,179,0,0.05) 40%,
  transparent 70%);
transform: translate(-50%, -50%);
z-index: 0;                     /* 内容用 .content-z 提到上层 */
```

#### 超大文字 (.ultra-large-text)
```css
font-size: clamp(3rem, 10vw, 8rem);   /* 响应式超大文字 */
font-weight: 900;
line-height: 1;
```

#### 大数字统计 (.large-stat-text)
```css
font-size: clamp(2.5rem, 6vw, 5rem);
font-weight: 700;
```

#### 其他
- **大触摸区域**：`.touch-target` — min 44px（iPad 优化）
- **高亮图标**：`color: #FFB300; margin-right: 0.5rem`
- **卡片内容层**：`position: relative; z-index: 1`（确保在光晕之上）

### 2.6 布局规范

- 容器最大宽度：`max-w-6xl`
- 卡片间距：`gap-6`
- 页面内边距：`px-4 py-8`
- 孩子端底部固定导航栏，iPad 适配

---

## 3. 功能模块

### 3.1 首页 (`/`)

- 品牌展示区（Logo + 标语 + 核心价值）
- 双入口：家长入口 `/parent` / 孩子入口 `/child`
- 三学科概览卡片

### 3.2 家长端 (`/parent`)

#### 3.2.1 家长中心首页 (`/parent`)

- 顶部导航（返回首页在左、标题居中）
- 6 个功能入口卡片
- 快速统计概览（学习内容数、正确率、学习时长、待审核）

#### 3.2.2 内容管理 (`/parent/content`)

- **手动上传**：上传图片/PDF，手动录入题目和内容
- **AI 识别**：调用 OpenAI Vision API 自动识别图片中的题目
- **外部资源**：接入第三方题库和学习资源
- 内容排期灵活：支持每日按学科录入、每周统一录入、AI 智能推荐

#### 3.2.3 内容审核 (`/parent/review`)

- 待审核队列（来源标识：AI识别/手动/外部）
- 通过/拒绝操作
- 审核统计

#### 3.2.4 学期目标 (`/parent/goals`)

- 当前学期信息（时间、进度条）
- 各学科目标分解（按周）
- 目标完成状态追踪

#### 3.2.5 学习计划 (`/parent/plans`)

- 本周计划视图（周一到周日）
- 每日任务安排（学科+题量）
- 完成状态标记

#### 3.2.6 数据看板 (`/parent/dashboard`)

- 核心指标：学习时长、正确率、完成题数、待复习错题数
- 学科掌握度进度条
- 最近学习记录时间线

#### 3.2.7 系统设置 (`/parent/settings`)

- 数据源管理（AI识别、外部题库、学校教材）
- 学习偏好（每日时长、难度、复习频率）
- 数据导入导出

### 3.3 孩子端 (`/child`)

#### 3.3.1 孩子首页 (`/child`)

- 个性化问候（根据时段）
- 今日学习进度条
- 今日任务卡片
- 功能入口网格：花园、练习、错题本、成就
- 本周统计
- 底部固定导航栏（首页、练习、花园、错题、我的）

#### 3.3.2 练习页面 (`/child/practice`)

- 题目展示区
- 选择题选项（大触摸区域）
- 即时反馈（正确/错误动画）
- 下一题/完成流程
- 进度条

#### 3.3.3 我的花园 (`/child/garden`)

- 连续学习天数
- 日历热力图
- 知识树（按学科分，带百分比）
- 成就徽章墙

#### 3.3.4 错题本 (`/child/review`)

- 学科筛选标签（全部/数学/语文/英语）
- 错题卡片（错误答案 vs 正确答案对比）
- 智能推荐提示（基于错题频率和知识关联）

---

## 4. 技术栈

| 层级 | 技术选型 | 版本 |
|------|---------|------|
| 框架 | Next.js (App Router) | 16.2.4 |
| 语言 | TypeScript | - |
| UI 库 | Tailwind CSS v4 + shadcn/ui | 4.x |
| 组件基础 | Radix UI (via shadcn) | - |
| 后端/数据库 | Supabase | - |
| 认证 | Supabase Auth | - |
| 存储 | Supabase Storage | - |
| AI | OpenAI Vision API | - |
| PWA | next-pwa | 5.6.0 |

---

## 5. 数据模型

### 5.1 核心实体

```
Profile (用户档案)
├── id, email, role (parent/child), parent_id

Material (学习资料)
├── id, subject, grade, type, title, content, source, status

Exercise (练习题)
├── id, material_id, question, options, correct_answer, difficulty, knowledge_points

LearningRecord (学习记录)
├── id, child_id, material_id, exercise_id, activity_type, duration, score, is_correct

WrongAnswer (错题)
├── id, child_id, exercise_id, wrong_count, last_wrong_at, mastered

Semester (学期)
├── id, name, start_date, end_date, grade

LearningGoal (学习目标)
├── id, semester_id, subject, week_number, title, priority, mastery_threshold

StudyPlan (学习计划)
├── id, child_id, title, daily_goal, start_date, end_date, status
```

### 5.2 类型定义

完整 TypeScript 类型定义在 `types/index.ts`，包含：
- 枚举类型：UserRole, Subject, Priority, MaterialType, SourceType, ContentStatus, Difficulty, ActivityType, ScheduleType, PlanStatus
- 接口：Profile, Material, Exercise, LearningRecord, WrongAnswer, Semester, LearningGoal, ContentSchedule, DataSource, AIRecommendation, StudyPlan

---

## 6. 项目结构

```
annas-garden/
├── app/
│   ├── layout.tsx              # 根布局 (zh-CN, antialiased)
│   ├── globals.css             # 吉卜力风格主题 + CSS 工具类
│   ├── page.tsx                # 首页
│   ├── parent/
│   │   ├── page.tsx            # 家长中心
│   │   ├── content/page.tsx    # 内容管理
│   │   ├── review/page.tsx     # 内容审核
│   │   ├── goals/page.tsx      # 学期目标
│   │   ├── plans/page.tsx      # 学习计划
│   │   ├── dashboard/page.tsx  # 数据看板
│   │   └── settings/page.tsx   # 系统设置
│   └── child/
│       ├── page.tsx            # 孩子首页
│       ├── practice/page.tsx   # 练习
│       ├── garden/page.tsx     # 我的花园
│       └── review/page.tsx     # 错题本
├── components/
│   └── shared/
│       └── page-nav.tsx        # 通用导航组件
├── lib/
│   ├── supabase/
│   │   └── client.ts          # Supabase 客户端 + 数据访问层
│   └── styles.ts               # 样式常量
├── types/
│   └── index.ts                # TypeScript 类型定义
├── doc/                        # 项目文档
└── .env.local.example          # 环境变量模板
```

---

## 7. 设计决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 架构模式 | 自适应单页应用 | 单用户场景，无需复杂多租户 |
| 内容来源 | 混合模式 | AI识别 + 外部数据源 + 手动录入 |
| 学习记录 | 纯个人追踪 | 不做排行榜/社交比较，关注个人成长 |
| 错题处理 | 自动识别 | 做错自动进入错题本 + 智能推荐复习 |
| 离线支持 | 可选 | 不强求 PWA 离线，锦上添花 |
| 深色模式 | 不支持 | 儿童应用场景不需要 |
| 色彩空间 | OKLCH | 更精确的颜色控制，CSS 变量使用 |
