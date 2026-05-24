# Anna's Garden - 开发计划与进度

> 最后更新：2026-04-18

## 当前进度概览

```
阶段一：基础框架搭建 ████████████████████ 100% ✅
阶段二：数据层接入     ████████████████████ 100% ✅
阶段三：核心功能开发   ██████████████░░░░░░ 70% ← 当前
阶段四：AI 与智能化   ░░░░░░░░░░░░░░░░░░░░  0%
阶段五：优化与发布     ░░░░░░░░░░░░░░░░░░░░  0%
```

---

## 阶段一：基础框架搭建 ✅ 完成

### 已完成

- [x] **项目初始化**
  - Next.js 16 + TypeScript + Tailwind CSS v4
  - shadcn/ui 组件库集成
  - 目录结构搭建
  - 环境变量模板
  - *文件：package.json, .env.local.example*

- [x] **吉卜力治愈风格主题系统**
  - OKLCH 色彩体系（米白、深棕、琥珀黄）
  - Glassmorphism 毛玻璃效果
  - 水彩纹理背景
  - iPad 触摸优化 (44px touch target)
  - CSS 工具类库（避免内联样式水合问题）
  - *文件：app/globals.css, lib/styles.ts*

- [x] **TypeScript 类型定义**
  - 全部数据模型类型（11 个接口 + 10 个枚举）
  - *文件：types/index.ts*

- [x] **Supabase 数据访问层**
  - 客户端初始化
  - CRUD 辅助函数（profiles, materials, exercises, learning_records, wrong_answers, semesters, goals, plans）
  - *文件：lib/supabase/client.ts*

- [x] **页面框架 - 首页**
  - Hero 区域 + 双入口（家长/孩子）
  - 三学科概览
  - *文件：app/page.tsx, app/layout.tsx*

- [x] **页面框架 - 家长端 (7 个页面)**
  - 家长中心首页（6 功能入口 + 快速统计）
  - 内容管理（三 Tab：手动/AI/外部）
  - 内容审核（待审核队列 + 审核统计）
  - 学期目标（学科进度 + 目标清单）
  - 学习计划（本周每日任务）
  - 数据看板（核心指标 + 学科掌握度 + 记录）
  - 系统设置（数据源 + 偏好 + 导入导出）
  - *文件：app/parent/**/*.tsx*

- [x] **页面框架 - 孩子端 (4 个页面)**
  - 孩子首页（问候、今日任务、底部导航）
  - 练习页面（选择题 + 即时反馈）
  - 我的花园（连续天数、知识树、成就）
  - 错题本（学科筛选 + 错题卡片 + 推荐提示）
  - *文件：app/child/**/*.tsx*

- [x] **通用组件**
  - PageNav 导航组件（返回+标题+右侧内容）
  - *文件：components/shared/page-nav.tsx*

- [x] **导航一致性修复**
  - 家长端/孩子端导航统一：返回按钮在左、标题居中
  - 孩子端各子页面导航结构标准化

### 待完成

- [ ] **Next.js 配置优化**
  - PWA manifest 配置
  - 图片优化策略

---

## 阶段二：数据层接入 ✅ 完成

- [x] **Supabase 数据库建表**
  - 11 张表 + 索引 + RLS 策略 + 自动创建 profile 触发器
  - 种子数据：一年级下学期 15 周目标（语数英各 15 条）+ 20 道示例题
  - *文件：supabase/migrations/001_initial_schema.sql, supabase/seed.sql*

- [x] **Supabase Auth 认证**
  - 浏览器端/服务端 Supabase 客户端（@supabase/ssr）
  - 认证中间件（未登录保护 /parent 和 /child 路由）
  - 登录/注册页面（吉卜力风格，登录/注册切换）
  - 注册时自动创建 profile 触发器
  - *文件：lib/supabase/client.ts, server.ts, middleware.ts, middleware.ts, app/auth/login/page.tsx*

- [ ] **Supabase Storage 文件存储**
  - 图片/PDF 上传
  - 文件管理

- [x] **API 路由**
  - `/api/materials` + `[id]` — 学习资料 CRUD
  - `/api/exercises` — 练习题查询/创建（支持按学科、难度筛选）
  - `/api/learning-records` — 学习记录 + 统计（时长、正确率）
  - `/api/wrong-answers` — 错题管理（自动 upsert + 标记掌握）
  - `/api/goals` — 学习目标查询（自动识别当前学期）
  - `/api/plans` — 学习计划管理
  - *文件：app/api/**/*.ts*

---

## 阶段三：核心功能开发 ← 当前阶段（约 70%）

- [x] **Mock 数据全部替换为真实 Supabase 连接**
  - 家长端 6 个页面全部接入真实数据库（content, dashboard, goals, plans, settings, review）
  - 孩子端 4 个页面全部接入真实数据库（home, practice, garden, review）
  - 内容管理：手动录入题目 + 外部数据源管理（同步/添加功能已实现）
  - 内容审核：展示题目详情、支持审核/拒绝/退回操作
  - 练习系统：动态加载题目、答题记录写入、错题自动追踪
  - 我的花园：连续学习天数、学科掌握度、成就徽章
  - 错题本：错题列表、学科筛选、标记已掌握
  - 数据看板：学习记录统计、学科掌握度
  - 学习计划：周视图、任务状态展示
  - 学期目标：学期进度、学科目标列表

- [ ] **内容录入功能（增强）**
  - ~~手动录入表单（题目、选项、答案、知识点标签）~~ ✅ 基础已实现
  - 图片上传预览
  - 批量录入

- [ ] **练习系统（增强）**
  - ~~从数据库动态加载题目~~ ✅
  - ~~答题记录写入~~ ✅
  - ~~正确率计算~~ ✅
  - 多题型支持（判断题、填空题）
  - 题目随机排序

- [ ] **错题本系统（增强）**
  - ~~做错自动入错题本~~ ✅
  - ~~错题筛选和排序~~ ✅
  - ~~复习后标记已掌握~~ ✅
  - 间隔复习算法（艾宾浩斯遗忘曲线）

- [ ] **学期目标体系**
  - ~~学期信息展示~~ ✅
  - ~~目标列表展示~~ ✅
  - ~~进度计算~~ ✅
  - 学期创建/切换
  - 目标 CRUD

- [ ] **学习计划（增强）**
  - ~~计划展示~~ ✅
  - ~~周视图~~ ✅
  - 计划创建/编辑
  - 计划完成标记交互
  - AI 自动排课

- [ ] **学习记录与统计（增强）**
  - ~~学习时长追踪~~ ✅
  - ~~知识点掌握度~~ ✅
  - 正确率趋势图（图表可视化）
  - 数据导出

---

## 阶段四：AI 与智能化

- [ ] **AI 图像识别**
  - OpenAI Vision API 集成
  - 图片题目自动识别
  - 识别结果编辑和确认

- [ ] **智能推荐**
  - 基于错题的复习推荐
  - 基于知识点的薄弱项推荐
  - 学习节奏建议

- [ ] **外部数据源**
  - 第三方题库接入
  - 学校教材同步
  - 数据源管理界面

---

## 阶段五：优化与发布

- [ ] **PWA 支持**
  - Service Worker 配置
  - 离线缓存策略
  - 添加到主屏幕

- [ ] **性能优化**
  - 图片懒加载
  - 组件代码分割
  - 数据缓存策略

- [ ] **部署**
  - Vercel 部署配置
  - Supabase 生产环境配置
  - 域名绑定

- [ ] **收尾**
  - 数据导出功能
  - 使用说明
  - 移动端适配微调

---

## 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| Hydration warning | 忽略 | 浏览器扩展注入 `data-atm-ext-installed` 导致，非代码问题 |

---

## 文件清单

```
源代码文件：

app/
  layout.tsx                    # 根布局
  globals.css                   # 主题样式
  page.tsx                      # 首页
  auth/login/page.tsx           # 登录/注册
  parent/
    page.tsx                    # 家长中心
    content/page.tsx            # 内容管理（手动录入 + 外部数据源）
    review/page.tsx             # 内容审核（详情展示 + 审核操作）
    goals/page.tsx              # 学期目标（进度追踪）
    plans/page.tsx              # 学习计划（周视图）
    dashboard/page.tsx          # 数据看板（学习统计）
    settings/page.tsx           # 系统设置（数据源 + 偏好）
  child/
    page.tsx                    # 孩子首页（今日任务 + 学科入口）
    practice/page.tsx           # 练习（选择题 + 反馈 + 结果）
    garden/page.tsx             # 我的花园（连续天数 + 知识树 + 成就）
    review/page.tsx             # 错题本（错题列表 + 复习）
  api/
    materials/route.ts          # 学习资料 CRUD
    materials/[id]/route.ts     # 单个资料操作
    exercises/route.ts          # 练习题查询/创建
    learning-records/route.ts   # 学习记录 + 统计
    wrong-answers/route.ts      # 错题管理
    goals/route.ts              # 学习目标
    plans/route.ts              # 学习计划

lib/
  supabase/client.ts            # 浏览器端 Supabase 客户端
  supabase/server.ts            # 服务端 Supabase 客户端
  supabase/middleware.ts        # Auth 中间件
  styles.ts                     # 样式常量

middleware.ts                    # Next.js 中间件入口
types/index.ts                  # TypeScript 类型定义

supabase/
  migrations/001_initial_schema.sql  # 数据库 Schema（11 张表 + RLS）
  seed.sql                           # 种子数据（学期 + 目标 + 题目）
```
