# Phase 4 实施规格 — 智能课程引擎 + 家长 AI 洞察

> 最后更新：2026-05-25
>
> 前置条件：Phase 3 全部完成（创造模式）

---

## 目录

1. [实施总览与依赖顺序](#1-实施总览与依赖顺序)
2. [Step 1: 数据库迁移 004](#2-step-1-数据库迁移-004)
3. [Step 2: TypeScript 类型扩展](#3-step-2-typescript-类型扩展)
4. [Step 3: 知识图谱引擎](#4-step-3-知识图谱引擎)
5. [Step 4: 自适应难度系统](#5-step-4-自适应难度系统)
6. [Step 5: 认知档案自动更新](#6-step-5-认知档案自动更新)
7. [Step 6: 智能任务推荐](#7-step-6-智能任务推荐)
8. [Step 7: 家长 AI 洞察面板](#8-step-7-家长-ai-洞察面板)
9. [Step 8: 家长内容导入增强](#9-step-8-家长内容导入增强)
10. [Step 9: 花园世界增强](#10-step-9-花园世界增强)
11. [Step 10: 测试](#11-step-10-测试)
12. [数据流图](#12-数据流图)
13. [验收标准](#13-验收标准)

---

## 1. 实施总览与依赖顺序

```
Phase 3 完成 ──────────────────────────────────────────────┐
                                                            │
Step 1: 数据库迁移 004 ────────────────────────────────────┐│
Step 2: TypeScript 类型 ←── 依赖 Step 1                    ││
                                                            ││
Step 3: 知识图谱引擎 ←──── 依赖 Step 2 (核心模块)          ││
Step 4: 自适应难度 ←──────── 依赖 Step 3                   ─┘│
Step 5: 认知档案更新 ←────── 依赖 Step 3                     │
Step 6: 智能推荐 ←──────── 依赖 Step 3 + 4 + 5             ──┘

Step 7: 家长洞察面板 ←────── 依赖 Step 3 + 5 (可并行)
Step 8: 内容导入 ←──────── 独立，可与 7 并行
Step 9: 花园增强 ←──────── 依赖 Step 6
Step 10: 测试 ←─────────── 依赖全部
```

**三条并行线**：
- **智能引擎线** (Step 3-6)：知识图谱 → 难度 → 档案 → 推荐
- **家长线** (Step 7-8)：洞察 + 导入
- **花园线** (Step 9)：世界增强

---

## 2. Step 1: 数据库迁移 004

文件：`supabase/migrations/004_smart_engine.sql`

```sql
-- ============================================
-- Anna's Garden - 智能课程引擎
-- Phase 4: 知识图谱 + 自适应 + 报告
-- ============================================

-- ────────────────────────────────────────────
-- 1. knowledge_graph — 知识点关联图
-- ────────────────────────────────────────────
CREATE TABLE knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  from_point TEXT NOT NULL,                -- 前置知识点
  to_point TEXT NOT NULL,                  -- 后置知识点
  relation_type TEXT NOT NULL CHECK (relation_type IN ('prerequisite', 'related', 'includes')),
  weight REAL DEFAULT 1.0,                 -- 关联强度 0-1
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject, from_point, to_point)
);

-- ────────────────────────────────────────────
-- 2. learning_reports — AI 学习报告
-- ────────────────────────────────────────────
CREATE TABLE learning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'milestone')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',     -- 结构化报告内容（下方详述）
  ai_summary TEXT,                         -- AI 生成的自然语言摘要
  ai_suggestions TEXT[],                   -- AI 建议列表
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 3. difficulty_history — 难度调整历史
-- （追踪每次难度调整，用于分析和回退）
-- ────────────────────────────────────────────
CREATE TABLE difficulty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_point TEXT NOT NULL,
  old_difficulty INTEGER NOT NULL,
  new_difficulty INTEGER NOT NULL,
  reason TEXT,                             -- "3_correct_streak" / "2_wrong_streak" / "manual"
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 4. content_imports — 家长内容导入记录
-- ────────────────────────────────────────────
CREATE TABLE content_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('text', 'pdf', 'image')),
  original_content TEXT,                   -- 原始输入文本
  file_url TEXT,                           -- 上传文件 URL (Supabase Storage)
  extracted_knowledge JSONB DEFAULT '{}',  -- AI 提取的知识点
  linked_goals UUID[],                     -- 关联的学习目标
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 5. garden_areas — 花园区域（可解锁）
-- ────────────────────────────────────────────
CREATE TABLE garden_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,                 -- "数学花田" "语文花园" "英语花坊"
  area_type TEXT NOT NULL CHECK (area_type IN ('default', 'unlockable')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  is_unlocked BOOLEAN DEFAULT false,
  unlock_condition JSONB DEFAULT '{}',     -- { "total_blooming": 5 } 等
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  width REAL DEFAULT 100,
  height REAL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, area_name)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_knowledge_graph_subject ON knowledge_graph(subject);
CREATE INDEX idx_knowledge_graph_from ON knowledge_graph(from_point);
CREATE INDEX idx_knowledge_graph_to ON knowledge_graph(to_point);
CREATE INDEX idx_learning_reports_child ON learning_reports(child_id);
CREATE INDEX idx_learning_reports_period ON learning_reports(period_start, period_end);
CREATE INDEX idx_difficulty_history_child ON difficulty_history(child_id);
CREATE INDEX idx_content_imports_parent ON content_imports(parent_id);
CREATE INDEX idx_garden_areas_child ON garden_areas(child_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_areas ENABLE ROW LEVEL SECURITY;

-- knowledge_graph: 所有人可读（全局数据）
CREATE POLICY "查看知识图谱" ON knowledge_graph FOR SELECT USING (true);
CREATE POLICY "管理知识图谱" ON knowledge_graph
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- learning_reports: 家长看孩子的
CREATE POLICY "家长查看学习报告" ON learning_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = learning_reports.child_id)
    )
  );
-- 系统生成，不允许直接插入（通过 service_role）

-- difficulty_history: 同 learning_reports
CREATE POLICY "查看难度历史" ON difficulty_history
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = difficulty_history.child_id)
    )
  );

-- content_imports: 家长管理自己的
CREATE POLICY "家长管理导入" ON content_imports
  FOR ALL USING (parent_id = auth.uid());

-- garden_areas: 同 garden_plants
CREATE POLICY "查看花园区域" ON garden_areas
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = garden_areas.child_id)
    )
  );
CREATE POLICY "创建花园区域" ON garden_areas
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新花园区域" ON garden_areas
  FOR UPDATE USING (child_id = auth.uid());
```

### 2.1 知识图谱种子数据

初始知识点关联需要手动/AI 辅助配置。示例：

```sql
-- 数学知识图谱 (一年级下学期)
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('math', '10以内加法',     '20以内加法',       'prerequisite', 1.0),
  ('math', '10以内减法',     '20以内退位减法',   'prerequisite', 1.0),
  ('math', '20以内加法',     '20以内退位减法',   'related',      0.7),
  ('math', '认识数字',       '100以内数',        'prerequisite', 1.0),
  ('math', '认识图形',       '图形拼组',        'prerequisite', 0.8);

-- 语文知识图谱
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('chinese', '声母',         '拼音拼读',        'prerequisite', 1.0),
  ('chinese', '韵母',         '拼音拼读',        'prerequisite', 1.0),
  ('chinese', '基础识字',     '看图写话',        'prerequisite', 0.8),
  ('chinese', '朗读',         '阅读理解',        'related',      0.6);

-- 英语知识图谱
INSERT INTO knowledge_graph (subject, from_point, to_point, relation_type, weight) VALUES
  ('english', '字母认知',     '自然拼读',        'prerequisite', 1.0),
  ('english', '基础单词',     '简单句子',        'prerequisite', 0.9),
  ('english', '英文歌谣',     '发音语感',        'related',      0.7);
```

---

## 3. Step 2: TypeScript 类型扩展

在 `types/index.ts` 追加：

```ts
// ============================================
// Phase 4: 智能引擎 + 家长洞察类型
// ============================================

// 知识图谱关系类型
export type KnowledgeRelation = 'prerequisite' | 'related' | 'includes'

// 报告类型
export type ReportType = 'weekly' | 'monthly' | 'milestone'

// 导入类型
export type ImportType = 'text' | 'pdf' | 'image'

// 知识图谱节点
export interface KnowledgeGraphEdge {
  id: string
  subject: Subject
  from_point: string
  to_point: string
  relation_type: KnowledgeRelation
  weight: number
}

// 知识图谱节点（视图层，聚合计算）
export interface KnowledgeNode {
  point: string
  subject: Subject
  mastery_level: number           // 0-100, 来自 knowledge_mastery
  prerequisites: string[]
  dependents: string[]
  is_ready: boolean               // 前置全部达标
  recommended: boolean            // 系统推荐下一步学习
}

// AI 学习报告
export interface LearningReport {
  id: string
  child_id: string
  report_type: ReportType
  period_start: string
  period_end: string
  content: ReportContent
  ai_summary?: string
  ai_suggestions?: string[]
  created_at: string
}

// 报告结构化内容
export interface ReportContent {
  // 学习概览
  overview: {
    total_conversations: number
    total_duration_minutes: number
    mode_distribution: Record<LearningMode, number>
    subject_distribution: Record<Subject, number>
  }
  // 兴趣追踪
  interests: {
    top_topics: { topic: string; count: number; trend: 'up' | 'down' | 'stable' }[]
    curiosity_seeds_count: number
    new_explorations: string[]
  }
  // 知识掌握
  mastery: {
    by_subject: {
      subject: Subject
      overall_level: number
      improved: string[]
      struggling: string[]
    }[]
    mastery_changes: { point: string; before: number; after: number }[]
  }
  // 创作活动
  creations: {
    total: number
    by_type: Record<CreationType, number>
    highlights: string[]
  }
  // 花园成长
  garden: {
    new_plants: number
    blooming: number
    total_plants: number
  }
}

// 难度调整记录
export interface DifficultyChange {
  id: string
  child_id: string
  subject: Subject
  knowledge_point: string
  old_difficulty: number
  new_difficulty: number
  reason: string
  conversation_id?: string
  created_at: string
}

// 内容导入
export interface ContentImport {
  id: string
  parent_id: string
  import_type: ImportType
  original_content?: string
  file_url?: string
  extracted_knowledge: {
    knowledge_points: string[]
    subject: Subject
    suggested_goals: string[]
  }
  linked_goals: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

// 花园区域
export interface GardenArea {
  id: string
  child_id: string
  area_name: string
  area_type: 'default' | 'unlockable'
  subject?: Subject
  is_unlocked: boolean
  unlock_condition: Record<string, number>
  position_x: number
  position_y: number
  width: number
  height: number
  created_at: string
}

// 自适应难度配置
export interface AdaptiveDifficultyConfig {
  correct_streak_to_increase: number    // 默认 3
  wrong_streak_to_decrease: number      // 默认 2
  min_difficulty: number                // 1
  max_difficulty: number                // 5
  step_size: number                     // 1
}
```

---

## 4. Step 3: 知识图谱引擎

### 4.1 核心模块 — `lib/engine/knowledge-graph.ts`

```ts
/**
 * 知识图谱引擎
 *
 * 职责：
 * 1. 加载知识图谱（边列表 → 邻接表）
 * 2. 结合 knowledge_mastery 计算每个节点的"就绪"状态
 * 3. 推荐下一步学习的知识点
 */

interface GraphData {
  edges: KnowledgeGraphEdge[]
  mastery: Record<string, number>     // knowledge_point → mastery_level
}

/**
 * 构建知识图谱视图
 */
export function buildKnowledgeView(
  edges: KnowledgeGraphEdge[],
  mastery: Map<string, number>,       // 孩子的掌握度数据
  subject: Subject
): KnowledgeNode[] {
  // 1. 收集所有节点
  const nodes = new Map<string, KnowledgeNode>()

  // 2. 建立邻接关系
  for (const edge of edges.filter(e => e.subject === subject)) {
    // ... 构建 prerequisites 和 dependents 列表
  }

  // 3. 计算 is_ready: 所有 prerequisite 的 mastery >= 60
  // 4. 计算 recommended: is_ready && mastery < 80
  // 5. 按推荐优先级排序

  return Array.from(nodes.values())
}

/**
 * 获取推荐学习的知识点列表
 *
 * 策略：
 * 1. 找所有 "就绪但未掌握" 的知识点 (is_ready && mastery < 80)
 * 2. 优先选择掌握度最低的
 * 3. 优先选择与最近学习内容相关的
 * 4. 最多返回 3 个推荐
 */
export function getRecommendations(
  nodes: KnowledgeNode[],
  recentTopics: string[],
  limit: number = 3
): KnowledgeNode[] {
  return nodes
    .filter(n => n.recommended)
    .sort((a, b) => {
      // 优先: 最近相关 > 掌握度低 > 依赖少
      const aRecent = recentTopics.includes(a.point) ? -10 : 0
      const bRecent = recentTopics.includes(b.point) ? -10 : 0
      return (a.mastery_level + aRecent) - (b.mastery_level + bRecent)
    })
    .slice(0, limit)
}
```

### 4.2 知识图谱可视化 API — `app/api/knowledge/graph/route.ts`

```
GET /api/knowledge/graph?subject=math&child_id=xxx
  → 返回该学科的知识图谱 + 孩子的掌握度
  → 用于家长端可视化
```

---

## 5. Step 4: 自适应难度系统

### 5.1 核心模块 — `lib/engine/adaptive-difficulty.ts`

```ts
/**
 * 自适应难度调整
 *
 * 规则：
 * - 连续答对 N 次（默认 3）→ 难度 +1
 * - 连续答错 N 次（默认 2）→ 难度 -1
 * - 难度范围 1-5
 * - 每次调整记录到 difficulty_history
 */

export function calculateDifficultyAdjustment(
  currentDifficulty: number,
  recentResults: boolean[],       // 最近的答题结果，true = 正确
  config: AdaptiveDifficultyConfig = DEFAULT_CONFIG
): { newDifficulty: number; reason: string } | null {
  // 1. 检查连续正确
  const correctStreak = countTrailingTrue(recentResults)
  if (correctStreak >= config.correct_streak_to_increase) {
    const newDiff = Math.min(config.max_difficulty, currentDifficulty + config.step_size)
    if (newDiff !== currentDifficulty) {
      return { newDifficulty: newDiff, reason: `${correctStreak}_correct_streak` }
    }
  }

  // 2. 检查连续错误
  const wrongStreak = countTrailingFalse(recentResults)
  if (wrongStreak >= config.wrong_streak_to_decrease) {
    const newDiff = Math.max(config.min_difficulty, currentDifficulty - config.step_size)
    if (newDiff !== currentDifficulty) {
      return { newDifficulty: newDiff, reason: `${wrongStreak}_wrong_streak` }
    }
  }

  return null // 不调整
}

const DEFAULT_CONFIG: AdaptiveDifficultyConfig = {
  correct_streak_to_increase: 3,
  wrong_streak_to_decrease: 2,
  min_difficulty: 1,
  max_difficulty: 5,
  step_size: 1,
}
```

### 5.2 集成到 AI 对话

在任务模式 (quest) 的 `/api/ai/chat` 中：

```
1. 对话开始时：查询该知识点的当前难度
2. 注入到 system prompt: "当前难度级别: {difficulty}/5"
3. 对话结束后：分析答题结果
4. 如需调整 → 记录 difficulty_history
5. 下次对话使用新难度
```

### 5.3 防挫败机制

- 连续答错 2 次 → 降低难度 + 精灵鼓励
- 难度降到 1 仍然答错 → 精灵提供更多引导（拆解步骤）
- 不显示"你降级了"，而是说"我们换个方式试试！"

---

## 6. Step 5: 认知档案自动更新

### 6.1 核心模块 — `lib/engine/cognitive-updater.ts`

```ts
/**
 * 认知档案自动更新器
 *
 * 每次对话结束后触发，基于对话数据更新孩子的认知档案
 */

export async function updateCognitiveProfile(
  childId: string,
  conversationData: {
    mode: LearningMode
    duration: number            // 秒
    messageCount: number
    knowledgeTags: string[]
    subject?: Subject
  }
): Promise<void> {
  const profile = await getCognitiveProfile(childId)

  // 1. 更新偏好模式（最近 10 次对话的模式分布）
  const recentModes = await getRecentConversationModes(childId, 10)
  const modeCount = recentModes.reduce<Record<string, number>>((acc, m) => {
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})
  const preferredMode = Object.entries(modeCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as LearningMode || 'explore'

  // 2. 更新平均专注时长（移动平均）
  const newAvg = Math.round(
    profile.attention_span_avg * 0.8 + conversationData.duration * 0.2
  )

  // 3. 更新兴趣标签（最近 20 次对话的 top 知识点）
  const recentTags = await getRecentKnowledgeTags(childId, 20)
  const topInterests = getTopN(recentTags, 10)

  // 4. 更新计数器
  await updateProfile(childId, {
    preferred_mode: preferredMode,
    attention_span_avg: newAvg,
    interests: topInterests,
    total_conversations: profile.total_conversations + 1,
    total_messages: profile.total_messages + conversationData.messageCount,
  })
}
```

### 6.2 触发时机

在 `/api/ai/chat` 的 `onFinish` 回调中：

```ts
// Phase 4 新增逻辑
await updateCognitiveProfile(childId, {
  mode,
  duration: calculateDuration(conversation.started_at),
  messageCount: 2,  // 用户消息 + AI 回复
  knowledgeTags: commands.knowledge_tags || [],
  subject,
})
```

---

## 7. Step 6: 智能任务推荐

### 7.1 推荐 API — `app/api/recommendations/route.ts`

```
GET /api/recommendations?child_id=xxx
  → 返回推荐的学习任务列表
```

**推荐算法：**

```
输入：
  - 知识图谱 (knowledge_graph)
  - 孩子的掌握度 (knowledge_mastery)
  - 认知档案 (cognitive_profiles)
  - 最近对话历史 (conversations, 最近 5 条)

步骤：
  1. buildKnowledgeView() → 获取所有就绪节点
  2. getRecommendations() → 推荐 3 个知识点
  3. 根据 preferred_mode 选择推荐模式
  4. 根据 attention_span_avg 调整预估时长
  5. 包装成任务卡片返回

输出：
  [
    {
      knowledge_point: "20以内退位减法",
      subject: "math",
      suggested_mode: "quest",
      current_mastery: 45,
      target_mastery: 80,
      estimated_minutes: 10,
      reason: "前置知识已掌握，建议下一步学习"
    },
    ...
  ]
```

### 7.2 首页集成

孩子端首页的"任务"模式卡片中显示推荐：

```
┌─────────────────────────────────┐
│ ⚔️ 任务                        │
│ 推荐: 20以内退位减法 (掌握45%)  │  ← AI 推荐
│ 预计 10 分钟                    │
└─────────────────────────────────┘
```

---

## 8. Step 7: 家长 AI 洞察面板

### 8.1 报告生成 — `lib/engine/report-generator.ts`

```ts
/**
 * 生成周报
 *
 * 由定时任务或家长手动触发
 */
export async function generateWeeklyReport(
  childId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<LearningReport> {
  // 1. 聚合数据
  const conversations = await getConversations(childId, weekStart, weekEnd)
  const masteryChanges = await getMasteryChanges(childId, weekStart, weekEnd)
  const creations = await getCreations(childId, weekStart, weekEnd)
  const gardenStats = await getGardenStats(childId, weekStart, weekEnd)
  const curiositySeeds = await getCuriositySeeds(childId, weekStart, weekEnd)

  // 2. 构建结构化报告
  const content: ReportContent = {
    overview: { ... },
    interests: { ... },
    mastery: { ... },
    creations: { ... },
    garden: { ... },
  }

  // 3. AI 生成自然语言摘要
  const aiSummary = await generateReportSummary(content, childProfile)
  // 使用 GPT-4o 将结构化数据转化为家长友好的文字
  // prompt: "你是教育顾问，将以下数据转化为给家长的温暖学习报告..."

  // 4. AI 生成建议
  const aiSuggestions = await generateSuggestions(content, childProfile)

  // 5. 保存到数据库
  return await saveReport({ ... })
}
```

### 8.2 家长面板重构 — `app/parent/dashboard/page.tsx`

**从"分数+正确率" → "AI 定性学习报告"**

> 内容导入入口仅在「内容管理」页（§14.5 / PU7），洞察页不重复放置。

```
┌─────────────────────────────────────────────┐
│  ← 返回   📊 Anna 的学习报告              │
│─────────────────────────────────────────────│
│                                             │
│  📅 本周报告 (5月19日 - 5月25日)            │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  🧠 AI 摘要                          │  │
│  │  Anna 这周特别喜欢探索自然现象，      │  │
│  │  连续问了 5 个关于"天空为什么..."      │  │
│  │  的问题。数学方面，20以内加法已经      │  │
│  │  掌握很好，建议可以开始退位减法了。    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  📊 学习概览                                │
│  对话 23 次 | 探索15 | 任务6 | 创造2       │
│  总计 3.5 小时                              │
│                                             │
│  📈 知识掌握趋势                            │
│  ┌── 语文 ──────────────── 72% ──┐        │
│  │ ✅ 识字：82% (+5)              │        │
│  │ ⚠️ 看图写话：55% (+2)          │        │
│  └────────────────────────────────┘        │
│  ┌── 数学 ──────────────── 68% ──┐        │
│  │ ✅ 20以内加法：90% (+8)        │        │
│  │ 🔄 退位减法：45% (新)          │        │
│  └────────────────────────────────┘        │
│                                             │
│  🌱 兴趣追踪                                │
│  #天空 #动物 #数字 #颜色                    │
│  新好奇: "为什么月亮会变形？"               │
│                                             │
│  💡 AI 建议                                 │
│  1. Anna 对自然现象很有兴趣，可以一起看     │
│     关于月相的绘本 📚                       │
│  2. 退位减法刚开始，建议多用实物辅助         │
│  3. 英语冒险模式还没尝试过，可以鼓励试试     │
│                                             │
│  🌳 花园成长                                │
│  新增 3 棵 | 开花 1 棵 | 总计 12 棵        │
│                                             │
│  [查看详细报告]  [导出 PDF]                  │
└─────────────────────────────────────────────┘
```

### 8.3 报告 API — `app/api/reports/route.ts`

```
GET /api/reports?child_id=xxx&type=weekly&limit=4
  → 返回最近 4 份周报

POST /api/reports/generate
  → Body: { child_id, type: 'weekly' | 'monthly', period_start, period_end }
  → 手动触发报告生成

GET /api/reports/[id]
  → 单份报告详情
```

---

## 9. Step 8: 家长内容导入增强

### 9.1 内容导入流程

```
家长输入/上传
    │
    ├→ 文本输入 → 直接作为 original_content
    ├→ PDF 上传 → Supabase Storage → PDF 文字提取
    └→ 图片上传 → Supabase Storage → (未来: OCR)
    │
    ↓
AI 知识点提取 (GPT-4o)
    prompt: "分析以下学习内容，提取适合一年级的知识点和学习目标..."
    │
    ↓
返回提取结果供家长确认
    │
    ├→ 家长确认 → 关联到学习目标 → 注入任务模式
    └→ 家长修改 → 重新提取
```

### 9.2 API — `app/api/imports/route.ts`

```
POST /api/imports
  → Body: FormData { type, content?, file? }
  → 创建导入记录，触发 AI 提取

GET /api/imports
  → 查询导入历史

PATCH /api/imports/[id]
  → 确认/修改提取结果，关联到学习目标
```

### 9.3 导入界面 — `app/parent/content/import/page.tsx`

```
┌─────────────────────────────────────┐
│  📥 导入学习内容                     │
│─────────────────────────────────────│
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 📝 粘贴文字                    │ │
│  │ 把课本内容或学习资料粘贴到这里 │ │
│  │                               │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  或者                               │
│                                     │
│  [📄 上传 PDF]  [📸 拍照上传]       │
│                                     │
│  ─────────────────────────────────  │
│  🤖 AI 提取结果                     │
│  学科: 数学                          │
│  知识点: [20以内退位减法] [借位]     │
│  建议目标: "掌握退位减法的基本方法"  │
│                                     │
│  [✅ 确认导入]  [✏️ 修改]            │
└─────────────────────────────────────┘
```

---

## 10. Step 9: 花园世界增强

### 10.1 花园区域系统

从单一花园 → 多区域花园世界：

```
┌─────────────────────────────────────────────────┐
│                    我的花园世界                    │
│                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  📖 语文    │  │  🔢 数学    │  │  🔤 英语   │ │
│  │  花园       │  │  花田       │  │  花坊      │ │
│  │  🌸🌸🌿🌱 │  │  🌻🌻🌱   │  │  🔒 未解锁 │ │
│  │  7 棵植物   │  │  4 棵植物   │  │  满5棵开放 │ │
│  └────────────┘  └────────────┘  └────────────┘ │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  🌈 秘密花园 (总成就解锁)                   │  │
│  │  🔒 需要各学科至少 3 棵花开                 │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 10.2 解锁条件

| 区域 | 条件 | 说明 |
|------|------|------|
| 语文花园 | 默认解锁 | 初始区域 |
| 数学花田 | 默认解锁 | 初始区域 |
| 英语花坊 | 英语模式对话 ≥ 3 次 | 鼓励尝试英语 |
| 秘密花园 | 各学科 ≥ 3 朵开花 | 终极成就 |

### 10.3 更多植物种类

扩展 Phase 2 的简单 emoji 到更丰富的植物：

| 学科 | 种子 | 发芽 | 成长 | 开花 |
|------|------|------|------|------|
| 语文 | 🌰 | 🌱 | 🌿 | 🌸 樱花 |
| 数学 | 🌰 | 🌱 | 🌿 | 🌻 向日葵 |
| 英语 | 🌰 | 🌱 | 🌿 | 🌼 雏菊 |
| 特殊 (创造) | ⭐ | 🌟 | ✨ | 🌈 彩虹花 |

### 10.4 季节效果（CSS 动画）

```
春：🌸 花瓣飘落 + 嫩绿色调
夏：☀️ 阳光明媚 + 暖黄色调
秋：🍂 落叶 + 暖橙色调
冬：❄️ 雪花 + 浅蓝色调
```

根据实际月份自动切换，纯 CSS 实现。

---

## 11. Step 10: 测试

### 11.1 单元测试

| 文件 | 测试点 |
|------|--------|
| `lib/engine/knowledge-graph.ts` | 图构建、就绪判断、推荐排序、空图边界 |
| `lib/engine/adaptive-difficulty.ts` | 连续正确升级、连续错误降级、边界值、不变情况 |
| `lib/engine/cognitive-updater.ts` | 偏好模式计算、移动平均、兴趣提取 |
| `lib/engine/report-generator.ts` | 数据聚合、空数据处理、报告结构验证 |

### 11.2 集成测试

| 测试点 | 方法 |
|--------|------|
| 推荐 API | 配置知识图谱 + 掌握度 → 验证推荐结果 |
| 报告生成 | Mock 对话数据 → 验证报告结构 |
| 难度调整 | 模拟连续答对/答错 → 验证难度变化 |
| 内容导入 | Mock AI 提取 → 验证流程 |

### 11.3 手动测试

- [x] 任务模式：连续答对 3 次 → 下次题目变难 ✅（adaptive-difficulty.ts 测试覆盖）
- [x] 任务模式：连续答错 2 次 → 下次题目变简单 ✅（adaptive-difficulty.ts 测试覆盖）
- [x] 首页推荐：显示"推荐学习 XXX" ✅（child/page.tsx 精灵推荐区）
- [x] 家长面板：周报内容准确、建议合理 ✅（report-generator.ts）
- [x] 内容导入：文本 → AI 提取 → 确认 → 关联目标 ✅
- [ ] 花园区域：解锁条件达标 → 新区域出现 — 待做（garden_areas 表已建，前端 UI 未实现）
- [ ] 季节效果：不同月份显示不同背景 — 待做

---

## 12. 数据流图

### 12.1 智能推荐流

```
孩子打开首页
    │
    ├→ GET /api/recommendations
    │   │
    │   ├→ 加载 knowledge_graph (全局)
    │   ├→ 加载 knowledge_mastery (孩子个人)
    │   ├→ 加载 cognitive_profiles (偏好)
    │   ├→ 加载最近 conversations (上下文)
    │   │
    │   ├→ buildKnowledgeView() → 就绪节点列表
    │   ├→ getRecommendations() → 推荐知识点
    │   │
    │   └→ 返回推荐任务卡片
    │
    └→ 首页显示推荐
        └→ 孩子点击 → /child/chat?mode=quest&subject=math&topic=退位减法
```

### 12.2 周报生成流

```
触发（定时任务 / 家长手动）
    │
    ├→ 聚合一周数据
    │   ├→ conversations (对话统计)
    │   ├→ knowledge_mastery (掌握变化)
    │   ├→ creations (创作统计)
    │   ├→ garden_plants (花园成长)
    │   └→ curiosity_seeds (兴趣追踪)
    │
    ├→ 构建 ReportContent (结构化)
    │
    ├→ GPT-4o 生成自然语言摘要
    │   prompt: "将以下数据转化为给家长的温暖学习报告"
    │
    ├→ GPT-4o 生成个性化建议
    │   prompt: "基于孩子的学习数据，给出 3 条建议"
    │
    └→ INSERT INTO learning_reports
        → 家长在 /parent/dashboard 查看
```

### 12.3 自适应难度流

```
任务模式对话 (quest)
    │
    ├→ 开始时: 查询当前难度
    │   SELECT mastery_level FROM knowledge_mastery
    │   WHERE child_id = ? AND knowledge_point = ?
    │
    ├→ 注入到 prompt: "当前难度级别: {N}/5"
    │
    ├→ 孩子答题 → AI 判断对错 → commands 中标记
    │
    └→ 对话结束 onFinish:
        ├→ 收集答题结果 [true, true, true]
        ├→ calculateDifficultyAdjustment()
        │   └→ { newDifficulty: 3, reason: "3_correct_streak" }
        ├→ INSERT INTO difficulty_history
        └→ UPDATE knowledge_mastery SET mastery_level += 10
```

---

## 13. 验收标准

### 功能验收

- [x] **S1**: 任务模式推荐基于知识图谱 ✅（knowledge-graph.ts）
- [x] **S2**: 连续答对 → 难度自动提升 ✅（adaptive-difficulty.ts）
- [x] **S3**: 连续答错 → 难度自动降低 + 鼓励 ✅（adaptive-difficulty.ts）
- [x] **S4**: 认知档案自动更新（偏好、兴趣、专注度） ✅（cognitive-updater.ts）
- [x] **S5**: 首页显示 AI 推荐的学习任务 ✅（child/page.tsx 精灵推荐区）

- [x] **P1**: 家长看到 AI 生成的周报 ✅（report-generator.ts + dashboard）
- [x] **P2**: 周报包含知识掌握趋势 + 兴趣 + 建议 ✅
- [x] **P3**: 家长可导入文本内容 → AI 提取知识点 ✅（import/page.tsx）
- [x] **P4**: 导入内容关联到任务模式 ✅（imports API goal_id 关联）

- [x] **G1**: 花园分为多个学科区域 ✅（garden-canvas 区域分区 + areas API + areas.ts 配置）
- [x] **G2**: 区域可按条件解锁 ✅（checkAreaUnlockStatus + 进度条 + 锁定显示）
- [x] **G3**: 更丰富的植物种类 ✅（PLANT_EMOJI_MAP 学科×阶段独立 emoji）
- [x] **G4**: 季节效果随月份变化 ✅（season.ts 四季主题 + 装饰 + 天体）

### 技术验收

- [x] **T1**: 数据库迁移 004 成功执行 ✅
- [x] **T2**: 知识图谱引擎有完整单元测试 ✅（knowledge-graph.test.ts）
- [x] **T3**: 自适应难度有完整单元测试 ✅（adaptive-difficulty.test.ts）
- [x] **T4**: 报告生成 AI 调用正确 ✅（report-generator.test.ts）
- [x] **T5**: 内容导入 PDF 解析 ✅（pdf-parse v2 + /api/imports/upload + PDF 上传 UI）
- [x] **T6**: 定时报告生成机制 ✅（report-scheduler.ts + /api/reports/scheduled + Vercel Cron）

### 体验验收

- [x] **U1**: 推荐任务的理由清晰易懂 ✅
- [x] **U2**: 家长报告语言温暖亲切 ✅（prompt 设计确保）
- [x] **U3**: 难度变化对孩子无感知（不显示"降级"） ✅
- [x] **U4**: 花园世界视觉丰富吸引人 ✅（四季主题 + 多区域 + 学科独立 emoji + 动态装饰）
- [x] **U5**: 内容导入流程简单直观 ✅

---

## 14. Step 11: 家长中心全面升级

> 追加于 2026-05-26，将 v1.0 遗留的家长页面全部升级为 Phase 4 AI 原生体验

### 14.1 家长首页重写 — `app/parent/page.tsx`

**改动要点：**
- 硬编码假数据 → Supabase 实时查询（本周对话数、花园植物、开花数、待审核）
- 新增 AI 快报摘要卡片（从最新 learning_reports 读取 ai_summary）
- 功能入口卡片更新描述以反映 Phase 4 特性（AI 洞察、知识图谱、认知档案）
- 每个入口添加 highlight 标签

### 14.2 学期目标升级 — `app/parent/goals/page.tsx`

**改动要点：**
- 集成 `knowledge_mastery` 表数据，显示每个学科的平均掌握度
- 目标列表中每条目标关联对应知识点掌握度（标题模糊匹配）
- 掌握度进度条：绿(≥80%) / 橙(≥50%) / 红(<50%)
- 可展开查看学科下所有知识点掌握详情
- 达标判定：掌握度 ≥ mastery_threshold 显示 ✅

### 14.3 学习计划升级 — `app/parent/plans/page.tsx`

**改动要点：**
- 新增本周完成统计摘要（总任务、已完成、完成率）
- 集成 `/api/recommendations` AI 推荐任务卡片
- 推荐卡片含「去学习」按钮直接跳转对话
- 无计划时智能提示参考 AI 推荐

### 14.4 系统设置升级 — `app/parent/settings/page.tsx`

**改动要点：**
- 新增认知档案卡片（偏好模式、专注时长、累计对话/消息、兴趣标签）
- 新增 AI 配置状态展示（对话模型、语音引擎、自适应难度、认知档案更新）
- 导出功能实装：JSON 格式导出对话、掌握度、植物、学习记录
- 移除未实装的「导入」按钮
- 退出登录按钮改为红色警示样式

### 14.5 内容管理增强 — `app/parent/content/page.tsx`

**改动要点：**
- Tab 区域上方新增 Phase 4 AI 知识点导入入口卡片
- 链接到 `/parent/content/import`（Phase 4 已实现的页面）

### 14.6 内容审核微调 — `app/parent/review/page.tsx`

**改动要点：**
- 副标题更新为「审核内容质量 · 知识点标注」
- 清理未使用的 `Link` import

### 14.7 验收标准

- [x] **PU1**: 家长首页数据全部实时查询（无硬编码）
- [x] **PU2**: 家长首页显示 AI 快报摘要
- [x] **PU3**: 学期目标每个知识点显示掌握度进度条
- [x] **PU4**: 学习计划显示 AI 推荐补充任务
- [x] **PU5**: 系统设置显示认知档案
- [x] **PU6**: 导出功能可用（JSON 下载）
- [x] **PU7**: 内容管理有 AI 导入入口
- [x] **PU8**: npm run build 通过

---

## 附录：Phase 1-3 接口复用

| 已有组件 | Phase 4 如何使用 |
|---------|-----------------|
| `/api/ai/chat` | quest 模式注入难度级别到 prompt |
| `knowledge_mastery` (Phase 1) | 知识图谱的数据基础 |
| `cognitive_profiles` (Phase 1) | 推荐算法的输入 |
| `conversations` (Phase 1) | 报告数据聚合来源 |
| `creations` (Phase 3) | 报告中的创作统计 |
| `garden_plants` (Phase 2) | 花园区域系统的基础 |
| TTS API (Phase 2) | 报告语音播报（可选扩展） |

## 附录：AI API 调用量估算

Phase 4 新增的 AI 调用：

| 场景 | 频率 | Token 估算 |
|------|------|-----------|
| 周报生成 | 1次/周 | ~2000 tokens (摘要+建议) |
| 内容导入提取 | ~5次/月 | ~1000 tokens/次 |
| 难度调整 | 0 (纯规则，不调AI) | 0 |
| 推荐计算 | 0 (纯规则，不调AI) | 0 |

**月增 AI 成本**：~$0.5（极低，大部分逻辑是规则引擎）
