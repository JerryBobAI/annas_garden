# Phase 3 实施规格 — 创造模式

> 最后更新：2026-05-25
>
> 前置条件：Phase 2 全部完成（语音交互 + 花园可视化）

---

## 目录

1. [实施总览与依赖顺序](#1-实施总览与依赖顺序)
2. [Step 1: 数据库迁移 003](#2-step-1-数据库迁移-003)
3. [Step 2: TypeScript 类型扩展](#3-step-2-typescript-类型扩展)
4. [Step 3: 创造模式 AI Prompt 体系](#4-step-3-创造模式-ai-prompt-体系)
5. [Step 4: 创造模式 API](#5-step-4-创造模式-api)
6. [Step 5: 故事创作模块](#6-step-5-故事创作模块)
7. [Step 6: 数学探索模块](#7-step-6-数学探索模块)
8. [Step 7: 英语冒险模块](#8-step-7-英语冒险模块)
9. [Step 8: 创作展示与收藏](#9-step-8-创作展示与收藏)
10. [Step 9: 测试](#10-step-9-测试)
11. [数据流图](#11-数据流图)
12. [验收标准](#12-验收标准)

---

## 1. 实施总览与依赖顺序

```
Phase 2 完成 ──────────────────────────────────────────────┐
                                                            │
Step 1: 数据库迁移 003 ────────────────────────────────────┐│
Step 2: TypeScript 类型 ←── 依赖 Step 1                    ││
Step 3: 创造模式 Prompt ←── 独立                           ││
Step 4: 创造模式 API ←──── 依赖 Step 2 + 3                ─┘│
                                                              │
Step 5: 故事创作 ←──────── 依赖 Step 4                      ──┘
Step 6: 数学探索 ←──────── 依赖 Step 4 （可与 5 并行）
Step 7: 英语冒险 ←──────── 依赖 Step 4 （可与 5、6 并行）
Step 8: 创作展示 ←──────── 依赖 Step 5 + 6 + 7
Step 9: 测试 ←──────────── 依赖全部
```

**关键特点**：Step 5/6/7 三个学科模块可以并行开发。

---

## 2. Step 1: 数据库迁移 003

文件：`supabase/migrations/003_creations.sql`

```sql
-- ============================================
-- Anna's Garden - 创作系统表
-- Phase 3: 创造模式
-- ============================================

-- ────────────────────────────────────────────
-- 1. creations — 创作作品
-- ────────────────────────────────────────────
CREATE TABLE creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creation_type TEXT NOT NULL CHECK (creation_type IN ('story', 'math_exploration', 'english_adventure')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  content JSONB NOT NULL DEFAULT '{}',     -- 结构化创作内容（下方详述）
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  knowledge_tags TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,            -- 故事字数 / 对话轮数
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
  cover_emoji TEXT DEFAULT '📖',           -- 创作封面 emoji
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 2. creation_pages — 创作"页面"
-- （故事按页存储，每页有文字 + 可选配图描述）
-- ────────────────────────────────────────────
CREATE TABLE creation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('child', 'fairy', 'both')),
  content TEXT NOT NULL,                   -- 该页内容
  illustration_prompt TEXT,                -- AI 生成的配图描述（未来可用于图片生成）
  knowledge_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creation_id, page_number)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_creations_child ON creations(child_id);
CREATE INDEX idx_creations_type ON creations(creation_type);
CREATE INDEX idx_creations_subject ON creations(child_id, subject);
CREATE INDEX idx_creations_status ON creations(status);
CREATE INDEX idx_creation_pages_creation ON creation_pages(creation_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_pages ENABLE ROW LEVEL SECURITY;

-- creations: 孩子看自己的，家长看孩子的
CREATE POLICY "孩子查看自己的创作" ON creations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的创作" ON creations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = creations.child_id)
    )
  );
CREATE POLICY "孩子创建创作" ON creations
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新自己的创作" ON creations
  FOR UPDATE USING (child_id = auth.uid());

-- creation_pages: 通过 creation 间接控制
CREATE POLICY "查看创作页面" ON creation_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id
        AND (c.child_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'parent'
            AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = c.child_id)
        ))
    )
  );
CREATE POLICY "创建创作页面" ON creation_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM creations c WHERE c.id = creation_pages.creation_id
        AND c.child_id = auth.uid()
    )
  );

-- ============================================
-- updated_at 触发器
-- ============================================
CREATE TRIGGER creations_updated_at
  BEFORE UPDATE ON creations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.1 content JSONB 结构

**故事 (story):**

```json
{
  "genre": "fairy_tale",
  "characters": ["小猫咪咪", "大鲸鱼"],
  "setting": "海底世界",
  "page_count": 5,
  "total_words": 320
}
```

**数学探索 (math_exploration):**

```json
{
  "topic": "20以内退位减法",
  "problem_count": 3,
  "correct_count": 2,
  "visualization_type": "emoji_blocks",
  "steps": [
    { "step": 1, "problem": "15 - 7 = ?", "answer": 8, "correct": true },
    { "step": 2, "problem": "13 - 5 = ?", "answer": 8, "correct": true },
    { "step": 3, "problem": "12 - 9 = ?", "answer": 4, "correct": false, "correct_answer": 3 }
  ]
}
```

**英语冒险 (english_adventure):**

```json
{
  "scenario": "pet_shop",
  "character": "shopkeeper",
  "dialogue_turns": 8,
  "new_words": ["dog", "cat", "fish", "please"],
  "pronunciation_attempts": 3
}
```

---

## 3. Step 2: TypeScript 类型扩展

在 `types/index.ts` 追加：

```ts
// ============================================
// Phase 3: 创造模式类型
// ============================================

// 创作类型
export type CreationType = 'story' | 'math_exploration' | 'english_adventure'

// 创作状态
export type CreationStatus = 'in_progress' | 'completed' | 'archived'

// 创作页面作者
export type PageAuthor = 'child' | 'fairy' | 'both'

// 创作作品
export interface Creation {
  id: string
  child_id: string
  creation_type: CreationType
  title: string
  subject: Subject
  content: StoryContent | MathContent | EnglishContent
  conversation_id?: string
  knowledge_tags: string[]
  word_count: number
  status: CreationStatus
  cover_emoji: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

// 创作页面
export interface CreationPage {
  id: string
  creation_id: string
  page_number: number
  author: PageAuthor
  content: string
  illustration_prompt?: string
  knowledge_tags: string[]
  created_at: string
}

// 故事内容
export interface StoryContent {
  genre: string
  characters: string[]
  setting: string
  page_count: number
  total_words: number
}

// 数学探索内容
export interface MathContent {
  topic: string
  problem_count: number
  correct_count: number
  visualization_type: string
  steps: MathStep[]
}

export interface MathStep {
  step: number
  problem: string
  answer: number
  correct: boolean
  correct_answer?: number
}

// 英语冒险内容
export interface EnglishContent {
  scenario: string
  character: string
  dialogue_turns: number
  new_words: string[]
  pronunciation_attempts: number
}
```

---

## 4. Step 3: 创造模式 AI Prompt 体系

### 4.1 故事创作 Prompt — `lib/ai/prompts-create.ts`

**精灵在故事模式中的行为：**

```
1. 开场：问孩子想编什么故事
   "你想编一个什么样的故事呀？🌟 是关于动物的？还是关于魔法的？"

2. 构思：引导孩子确定角色、场景、情节
   "好有趣！那我们的故事里有谁呢？给主角起个名字吧！"

3. 共创：孩子说一段，精灵续一段
   "你说的太棒了！然后呢...小猫咪咪发现了一扇神奇的门！门后面会是什么？"

4. 收尾：引导故事结局
   "故事快要结束了，你觉得咪咪最后怎么样了？"

5. 完成：总结 + 花园事件
   "我们一起编了一个好棒的故事！🌸 花园里又开了一朵花哦！"
```

**Prompt 要点：**
- 每次只推进一小步
- 故事每"翻一页"生成一个 creation_page
- 自动提取 knowledge_tags（词汇、句型等）
- 在 options 中提供方向选择（"A. 小猫去森林" / "B. 小猫去海边"）
- illustration_prompt 自动生成（描述画面，为未来图片生成预留）

### 4.2 数学探索 Prompt

**精灵在数学模式中的行为：**

```
1. 情境创设
   "小兔子去超市买东西！🐰 它有 15 块钱，买了一包饼干花了 7 块..."

2. 引导思考
   "小兔子还剩多少钱呀？我们一起算算看！"

3. 可视化辅助（emoji 积木）
   "🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎 有 15 个苹果
    去掉 7 个：❌❌❌❌❌❌❌🍎🍎🍎🍎🍎🍎🍎🍎
    还剩几个？数一数！"

4. 答对鼓励 / 答错引导
   答对："太厉害了！⭐ 小兔子高兴地买到了饼干！"
   答错："差一点点！我们再数一次？🍎 一个两个三个..."

5. 进阶（难度递增）
   "小兔子又想买一瓶牛奶，要 5 块钱..."
```

**Prompt 要点：**
- 每道题包装成故事情境
- 提供 emoji 可视化辅助
- options 提供计算结果选项
- 错误不直接给答案，用引导方式
- 连续答对自动提升难度

### 4.3 英语冒险 Prompt

**精灵在英语模式中的行为：**

```
1. 场景建立
   "Let's go to the pet shop! 🐕 我们去宠物店！
    I am the shopkeeper. 你来当小客人好吗？"

2. 简单对话
   精灵: "Hello! Welcome! What pet do you like?"
   提供选项: ["I like dogs 🐕" / "I like cats 🐱" / "I like fish 🐟"]

3. 语言学习
   "Great choice! 'Dog' 这个单词，d-o-g，跟我读一遍！🗣"
   (Phase 2 语音已可用，这里结合发音练习)

4. 渐进难度
   从单词 → 短句 → 简单对话

5. 总结
   "太棒了！今天你学会了 3 个新单词：dog, cat, fish! 🌟"
```

**Prompt 要点：**
- 中英混合（中文解释 + 英文对话）
- options 提供英文回复选项（降低输入难度）
- 标记 new_words
- 结合 Phase 2 语音做发音练习
- 场景贴近日常生活（商店、学校、公园、家）

---

## 5. Step 4: 创造模式 API

### 5.1 创作 CRUD — `app/api/creations/route.ts`

```
GET /api/creations
  → 查询参数: ?type=story&subject=chinese&status=completed&limit=20
  → 返回创作列表（含 page_count，不含详细 pages）

POST /api/creations
  → Body: { creation_type, title, subject, cover_emoji? }
  → 创建新创作，返回 creation 对象

GET /api/creations/[id]
  → 返回创作详情 + 所有 pages

PATCH /api/creations/[id]
  → Body: { title?, status?, is_favorite?, content?, cover_emoji? }
  → 更新创作

POST /api/creations/[id]/pages
  → Body: { page_number, author, content, illustration_prompt?, knowledge_tags? }
  → 添加新页面

GET /api/creations/[id]/pages
  → 返回所有页面（按 page_number 排序）
```

### 5.2 AI 对话中的创作自动保存

当用户在 **创造模式** 对话时，AI 回复中的每个"故事段落"自动保存为 creation_page。

在 `/api/ai/chat` 的 `onFinish` 中增加创造模式逻辑：

```ts
if (mode === 'create') {
  // 检查是否有进行中的创作
  let creation = await getActiveCreation(childId, conversationId)

  if (!creation) {
    // 首次创造 → 创建创作记录
    creation = await createCreation({
      child_id: childId,
      creation_type: inferCreationType(subject),
      title: '未命名创作',  // 后续 AI 自动生成标题
      subject: subject || 'chinese',
      conversation_id: conversationId,
    })
  }

  // AI 回复中包含创作内容 → 保存为新页面
  if (commands.creation_page) {
    await addCreationPage({
      creation_id: creation.id,
      page_number: creation.content.page_count + 1,
      author: 'both',
      content: commands.creation_page,
      illustration_prompt: commands.illustration_prompt,
      knowledge_tags: commands.knowledge_tags || [],
    })
  }
}
```

---

## 6. Step 5: 故事创作模块

### 6.1 入口

从 `/child/chat?mode=create&subject=chinese` 进入。

Phase 1 的对话页面直接复用，只是 prompt 不同。

### 6.2 创作完成后的展示

对话结束 → 精灵提示"要不要看看我们编的故事？"
→ 跳转 `/child/creations/[id]`

### 6.3 故事阅读界面 — `app/child/creations/[id]/page.tsx`

```
┌─────────────────────────────────┐
│  ← 返回    📖 咪咪的冒险       │
│─────────────────────────────────│
│                                 │
│       [封面 emoji 放大显示]      │
│       📖 咪咪的冒险             │
│       作者：Anna & 花园精灵      │
│                                 │
│  ─ ─ ─ ─ 第 1 页 ─ ─ ─ ─ ─   │
│  从前有一只小猫叫咪咪...        │
│  (illustration_prompt 区域)      │
│                                 │
│  ─ ─ ─ ─ 第 2 页 ─ ─ ─ ─ ─   │
│  咪咪发现了一扇门...            │
│                                 │
│  ... (翻页浏览)                 │
│                                 │
│  📊 这个故事的知识点            │
│  [识字] [好词好句] [想象力]      │
│                                 │
│  ❤️ 收藏   🔗 分享给爸爸妈妈   │
└─────────────────────────────────┘
```

---

## 7. Step 6: 数学探索模块

### 7.1 入口

`/child/chat?mode=create&subject=math`

### 7.2 数学可视化组件 — `components/child/math-visual.tsx`

```ts
interface MathVisualProps {
  type: 'emoji_blocks' | 'number_line' | 'groups'
  total: number
  highlight?: number              // 高亮部分
  operation?: '+' | '-'
}
```

**emoji 积木示例（15 - 7 = ?）：**

```
🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡🟡  ← 15 个
❌❌❌❌❌❌❌🟡🟡🟡🟡🟡🟡🟡🟡  ← 去掉 7 个
                    答案: 8 个！
```

> 注意：这个可视化是在 AI 回复的 text 中用 emoji 实现的，不需要复杂的画布组件。
> MathVisual 组件仅做辅助美化和动画。

### 7.3 数学结果记录

每道题的结果自动记录到 `creation.content.steps[]`，并更新 `knowledge_mastery`。

---

## 8. Step 7: 英语冒险模块

### 8.1 入口

`/child/chat?mode=create&subject=english`

### 8.2 英语专属组件

**单词卡片 — `components/child/word-card.tsx`：**

```ts
interface WordCardProps {
  word: string                    // "dog"
  emoji: string                   // "🐕"
  phonetic?: string               // "/dɒɡ/"
  chinese?: string                // "狗"
  onPronounce?: () => void        // 播放发音
}
```

```
┌──────────────────┐
│      🐕          │
│      dog         │
│    /dɒɡ/ 🔊     │   ← 点击播放发音 (TTS)
│      狗          │
└──────────────────┘
```

**新单词收集面板 — `components/child/word-collection.tsx`：**

对话结束后，自动收集本次学到的新单词：

```
┌──────────────────────────────────┐
│  ⭐ 今天学到的新单词！            │
│                                  │
│  🐕 dog   🐱 cat   🐟 fish     │
│                                  │
│  [再练习一次]   [收藏到花园]     │
└──────────────────────────────────┘
```

### 8.3 发音练习

结合 Phase 2 的语音功能：
1. 精灵说出英文单词 (TTS)
2. 孩子跟读 (录音 → STT)
3. 对比识别结果和目标单词
4. 结果反馈（匹配度判断用字符串匹配，不需要额外 AI）

---

## 9. Step 8: 创作展示与收藏

### 9.1 创作列表 — `app/child/creations/page.tsx`

从首页的"创造"模式卡片或底部导航进入。

```
┌─────────────────────────────────┐
│  ← 返回    🎨 我的创作   [筛选] │
│─────────────────────────────────│
│                                 │
│  ┌────────┐  ┌────────┐       │
│  │ 📖     │  │ 🔢     │       │
│  │ 咪咪   │  │ 买苹果  │       │
│  │ 的冒险  │  │ 大挑战  │       │
│  │ ❤️ 5页  │  │ 3道题   │       │
│  └────────┘  └────────┘       │
│                                 │
│  ┌────────┐  ┌────────┐       │
│  │ 🔤     │  │ 📖     │       │
│  │ Pet    │  │ 小兔子  │       │
│  │ Shop   │  │ 的旅行  │       │
│  │ 8轮对话 │  │ ❤️ 3页  │       │
│  └────────┘  └────────┘       │
│                                 │
│  📊 创作统计                    │
│  故事 3 篇 | 数学 5 次 | 英语 2 次│
└─────────────────────────────────┘
```

### 9.2 创作与花园联动

| 创造事件 | 花园效果 |
|---------|---------|
| 开始一个新创作 | 种下新种子 (seed_planted) |
| 故事写到第 3 页 | 种子发芽 (sprout) |
| 完成一个创作 | 花朵绽放 (bloom) |
| 数学全部答对 | 直接开花 |
| 英语学会 3+ 新单词 | 发芽 |

### 9.3 首页模式卡片更新

"创造"模式入口卡片新增子菜单：

```
[🎨 创造]
├── 📖 编故事 → /child/chat?mode=create&subject=chinese
├── 🔢 数学探索 → /child/chat?mode=create&subject=math
└── 🔤 英语冒险 → /child/chat?mode=create&subject=english
```

---

## 10. Step 9: 测试

### 10.1 单元测试

| 文件 | 测试点 |
|------|--------|
| `lib/ai/prompts-create.ts` | 各模式 prompt 包含关键指令、subject 正确注入 |
| Creation content JSON | 各类型 content 的 schema 验证 |

### 10.2 集成测试

| 测试点 | 方法 |
|--------|------|
| `/api/creations` CRUD | 创建、查询、更新、翻页 |
| 创造模式对话 → 自动保存 | Mock AI → 验证 creation + pages 正确创建 |
| 创造 → 花园联动 | 完成创作 → 验证 garden_plants 更新 |

### 10.3 手动测试

- [ ] 故事创作：孩子和精灵轮流写 → 完整故事 → 阅读模式
- [ ] 数学探索：情境题 → emoji 可视化 → 答对鼓励/答错引导
- [ ] 英语冒险：场景对话 → 单词卡片 → 发音练习
- [ ] 创作列表：筛选、收藏功能
- [ ] 花园联动：创作触发植物成长

---

## 11. 数据流图

### 11.1 创造模式对话流

```
用户选择创造模式 + 学科
    │
    ├→ /child/chat?mode=create&subject={subject}
    │
    ├→ useChat → /api/ai/chat (复用 Phase 1)
    │   └→ prompt = getCreatePrompt() ← 学科专属版本
    │
    └→ AI 回复解析
        ├→ text → 对话气泡显示
        ├→ commands.options → 选项按钮
        ├→ commands.garden_event → 花园联动
        └→ commands.creation_page → 自动保存创作页面
```

### 11.2 创作保存流

```
AI 对话 onFinish (mode = 'create')
    │
    ├→ 首次？ → POST /api/creations → 创建创作记录
    │
    ├→ 检测 creation_page 内容
    │   └→ POST /api/creations/{id}/pages → 保存新页面
    │
    ├→ 更新 creation.content (word_count, page_count 等)
    │
    └→ 对话结束？
        ├→ 更新 creation.status = 'completed'
        ├→ 触发 garden_event: 'bloom'
        └→ 提示 "要不要看看我们的创作？"
```

---

## 12. 验收标准

### 功能验收

- [x] **C1**: 故事创作完整流程（构思 → 共创 → 完成 → 阅读）
- [x] **C2**: 数学探索完整流程（情境 → 做题 → 可视化 → 结果）
- [x] **C3**: 英语冒险完整流程（场景 → 对话 → 单词 → 发音）
- [x] **C4**: 创作自动保存到数据库
- [x] **C5**: 创作列表按类型/学科筛选
- [x] **C6**: 创作收藏功能
- [x] **C7**: 创作完成触发花园植物开花
- [x] **C8**: 数学答题结果记录到 knowledge_mastery

### 技术验收

- [x] **T1**: 数据库迁移 004 成功执行
- [x] **T2**: creations + creation_pages 的 CRUD + RLS 正常
- [x] **T3**: 创造模式 Prompt 单元测试 19 用例通过
- [ ] **T4**: 三种创造 prompt 各有至少 3 轮测试对话（需手动验证）

### 体验验收

- [x] **U1**: 故事阅读界面翻页顺畅
- [x] **U2**: 数学 emoji 可视化直观易懂
- [x] **U3**: 英语单词卡片清晰美观
- [x] **U4**: 创作列表有吸引力

---

## 附录：Phase 1/2 接口复用

| 已有组件 | Phase 3 如何使用 |
|---------|-----------------|
| `/api/ai/chat` | 创造模式复用同一路由，仅 prompt 不同 |
| `useChat()` | 完全复用 |
| `ChatBubble` | 完全复用 |
| `OptionButtons` | 完全复用（故事选择、数学答案、英语回复） |
| `FairyAvatar` | 完全复用 |
| `VoiceButton` (Phase 2) | 英语冒险的发音练习复用 |
| TTS API (Phase 2) | 英语单词发音播放 |
| 花园联动 (Phase 2) | 创作事件触发花园 |
| `knowledge_mastery` | 数学和语文知识点追踪 |
