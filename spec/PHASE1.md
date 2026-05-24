# Phase 1 实施规格 — AI 对话核心 + 孩子端重写

> 最后更新：2026-05-25
>
> 本文档是 Phase 1 的详细实施蓝图。所有技术细节在此定义清楚，动手写代码时直接照着做。

---

## 目录

1. [实施总览与依赖顺序](#1-实施总览与依赖顺序)
2. [Step 1: 安装依赖](#2-step-1-安装依赖)
3. [Step 2: 数据库迁移 002](#3-step-2-数据库迁移-002)
4. [Step 3: TypeScript 类型定义](#4-step-3-typescript-类型定义)
5. [Step 4: AI 核心模块](#5-step-4-ai-核心模块)
6. [Step 5: API 路由](#6-step-5-api-路由)
7. [Step 6: 孩子端布局重构](#7-step-6-孩子端布局重构)
8. [Step 7: 孩子端首页重写](#8-step-7-孩子端首页重写)
9. [Step 8: AI 对话界面](#9-step-8-ai-对话界面)
10. [Step 9: Onboarding 引导流](#10-step-9-onboarding-引导流)
11. [Step 10: 家长端布局改造](#11-step-10-家长端布局改造)
12. [Step 11: 测试](#12-step-11-测试)
13. [组件树](#13-组件树)
14. [数据流图](#14-数据流图)
15. [验收标准](#15-验收标准)

---

## 1. 实施总览与依赖顺序

```
Step 1: 安装依赖 ─────────────────────────────────┐
Step 2: 数据库迁移 002 ──────────────────────────┐ │
Step 3: TypeScript 类型 ←─── 依赖 Step 2 的表结构 │ │
Step 4: AI 核心模块 ←──── 依赖 Step 1 的 ai 包     │ │
Step 5: API 路由 ←──────── 依赖 Step 3 + Step 4    │ │
Step 6: 孩子端布局 ←─────── 依赖 Step 2 (独立)     ─┘ │
Step 7: 孩子端首页 ←─────── 依赖 Step 6             ──┘
Step 8: AI 对话界面 ←────── 依赖 Step 5 + Step 6
Step 9: Onboarding ←──────── 依赖 Step 8
Step 10: 家长端布局 ←──────── 独立，可并行
Step 11: 测试 ←──────────── 依赖 Step 4 + Step 5
```

**预估工作量**（仅供参考，不设 deadline）：
- Step 1-3: 基础设施 ~ 2-3 小时
- Step 4-5: AI 引擎 ~ 4-6 小时
- Step 6-9: UI ~ 8-12 小时
- Step 10: 家长端 ~ 1-2 小时
- Step 11: 测试 ~ 3-4 小时

---

## 2. Step 1: 安装依赖

### 2.1 新增生产依赖

```bash
npm install ai @ai-sdk/openai
```

| 包名 | 用途 | 说明 |
|------|------|------|
| `ai` | Vercel AI SDK 核心 | 提供 `streamText()`, `useChat()` 等 |
| `@ai-sdk/openai` | OpenAI Provider | GPT-4o 对接，支持 streaming |

### 2.2 新增开发依赖

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

| 包名 | 用途 |
|------|------|
| `jest` | 单元测试框架 |
| `ts-jest` | TypeScript 支持 |
| `@testing-library/react` | React 组件测试 |
| `@testing-library/jest-dom` | DOM 断言 |
| `jest-environment-jsdom` | 浏览器环境模拟 |

> Playwright (E2E) 可稍后安装，不阻塞 Phase 1 核心开发。

### 2.3 环境变量

在 `.env.local` 中新增：

```env
# OpenAI — Phase 1 必须
OPENAI_API_KEY=sk-...
```

### 2.4 package.json 更新

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### 2.5 Jest 配置

创建 `jest.config.ts`:

```ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

export default config
```

创建 `jest.setup.ts`:

```ts
import '@testing-library/jest-dom'
```

---

## 3. Step 2: 数据库迁移 002

### 3.1 完整 SQL

文件：`supabase/migrations/002_ai_conversations.sql`

```sql
-- ============================================
-- Anna's Garden - AI 对话系统表
-- Phase 1: AI 对话核心
-- ============================================

-- ────────────────────────────────────────────
-- 1. conversations — AI 对话会话
-- ────────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('explore', 'quest', 'create')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  title TEXT,                              -- 对话标题（AI 自动生成或默认）
  summary TEXT,                            -- 对话摘要（AI 后处理生成）
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',             -- { garden_events: [], knowledge_tags: [], difficulty_avg: 0 }
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,                    -- 对话结束时间，NULL 表示进行中
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 2. messages — 对话消息
-- ────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,                   -- 纯文字内容
  structured_output JSONB,                 -- AI 结构化指令 { emotion, options[], knowledge_tags[], garden_event }
  voice_url TEXT,                          -- 语音文件 URL（Phase 2 使用，先预留）
  token_count INTEGER DEFAULT 0,           -- 该消息的 token 数
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 3. curiosity_seeds — 好奇心种子
-- （孩子在探索模式中提出的问题）
-- ────────────────────────────────────────────
CREATE TABLE curiosity_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,                  -- 孩子问的原始问题
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_tags TEXT[] DEFAULT '{}',
  explored BOOLEAN DEFAULT false,          -- 是否已深入探索
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 4. cognitive_profiles — 认知档案
-- （每个孩子一条记录，持续更新）
-- ────────────────────────────────────────────
CREATE TABLE cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_mode TEXT DEFAULT 'explore' CHECK (preferred_mode IN ('explore', 'quest', 'create')),
  attention_span_avg INTEGER DEFAULT 600,  -- 平均专注时长（秒），默认 10 分钟
  vocabulary_level INTEGER DEFAULT 1,      -- 词汇水平估计 1-10
  interests TEXT[] DEFAULT '{}',           -- 兴趣标签
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 5. knowledge_mastery — 知识掌握度
-- （每个知识点一条记录）
-- ────────────────────────────────────────────
CREATE TABLE knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_point TEXT NOT NULL,           -- 知识点名称，如 "加法" "声母"
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  source_conversations UUID[] DEFAULT '{}', -- 关联的对话 ID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, subject, knowledge_point)
);

-- ────────────────────────────────────────────
-- 6. garden_plants — 花园植物
-- （Phase 2 使用，Phase 1 先建表）
-- ────────────────────────────────────────────
CREATE TABLE garden_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,                               -- 植物名字（孩子可自定义）
  plant_type TEXT NOT NULL DEFAULT 'seed' CHECK (plant_type IN ('seed', 'sprout', 'growing', 'blooming', 'withered')),
  subject TEXT CHECK (subject IN ('chinese', 'math', 'english')),
  knowledge_tags TEXT[] DEFAULT '{}',
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  growth_stage INTEGER DEFAULT 0 CHECK (growth_stage >= 0 AND growth_stage <= 100),
  last_watered_at TIMESTAMPTZ DEFAULT now(),
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_conversations_child ON conversations(child_id);
CREATE INDEX idx_conversations_mode ON conversations(mode);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_curiosity_seeds_child ON curiosity_seeds(child_id);
CREATE INDEX idx_cognitive_profiles_child ON cognitive_profiles(child_id);
CREATE INDEX idx_knowledge_mastery_child ON knowledge_mastery(child_id);
CREATE INDEX idx_knowledge_mastery_subject ON knowledge_mastery(child_id, subject);
CREATE INDEX idx_garden_plants_child ON garden_plants(child_id);

-- ============================================
-- RLS 策略
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE curiosity_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;

-- conversations: 孩子看自己的，家长看孩子的
CREATE POLICY "孩子查看自己的对话" ON conversations
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的对话" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = conversations.child_id)
    )
  );
CREATE POLICY "孩子创建对话" ON conversations
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新自己的对话" ON conversations
  FOR UPDATE USING (child_id = auth.uid());

-- messages: 通过 conversation 的权限间接控制
CREATE POLICY "查看对话消息" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.child_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'parent'
            AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = c.child_id)
        ))
    )
  );
CREATE POLICY "创建对话消息" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.child_id = auth.uid()
    )
  );

-- curiosity_seeds: 同 conversations 逻辑
CREATE POLICY "孩子查看自己的种子" ON curiosity_seeds
  FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "家长查看孩子的种子" ON curiosity_seeds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = curiosity_seeds.child_id)
    )
  );
CREATE POLICY "孩子创建种子" ON curiosity_seeds
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "孩子更新种子" ON curiosity_seeds
  FOR UPDATE USING (child_id = auth.uid());

-- cognitive_profiles: 孩子读自己的，系统写入
CREATE POLICY "查看认知档案" ON cognitive_profiles
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = cognitive_profiles.child_id)
    )
  );
CREATE POLICY "创建认知档案" ON cognitive_profiles
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新认知档案" ON cognitive_profiles
  FOR UPDATE USING (child_id = auth.uid());

-- knowledge_mastery: 同认知档案
CREATE POLICY "查看知识掌握" ON knowledge_mastery
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = knowledge_mastery.child_id)
    )
  );
CREATE POLICY "创建知识掌握" ON knowledge_mastery
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新知识掌握" ON knowledge_mastery
  FOR UPDATE USING (child_id = auth.uid());

-- garden_plants: 同认知档案
CREATE POLICY "查看花园植物" ON garden_plants
  FOR SELECT USING (
    child_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.id = (SELECT pr.parent_id FROM profiles pr WHERE pr.id = garden_plants.child_id)
    )
  );
CREATE POLICY "创建花园植物" ON garden_plants
  FOR INSERT WITH CHECK (child_id = auth.uid());
CREATE POLICY "更新花园植物" ON garden_plants
  FOR UPDATE USING (child_id = auth.uid());

-- ============================================
-- updated_at 触发器
-- ============================================
CREATE TRIGGER cognitive_profiles_updated_at
  BEFORE UPDATE ON cognitive_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_mastery_updated_at
  BEFORE UPDATE ON knowledge_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 迁移注意事项

- `update_updated_at()` 函数已在 001 迁移中创建，直接复用
- `garden_plants` 表 Phase 1 只建表，不写业务逻辑
- `voice_url` 字段 Phase 1 只预留，Phase 2 使用
- 所有 RLS 策略遵循现有模式：孩子看自己的，家长看孩子的

---

## 4. Step 3: TypeScript 类型定义

在 `types/index.ts` 文件末尾追加以下类型：

```ts
// ============================================
// Phase 1: AI 对话系统类型
// ============================================

// 学习模式
export type LearningMode = 'explore' | 'quest' | 'create'

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 精灵情绪
export type FairyEmotion = 'happy' | 'thinking' | 'surprised' | 'cheering'

// 植物类型（Phase 2 使用，类型先定义）
export type PlantType = 'seed' | 'sprout' | 'growing' | 'blooming' | 'withered'

// 花园事件
export type GardenEvent = 'seed_planted' | 'sprout' | 'bloom' | null

// AI 结构化输出
export interface AIStructuredOutput {
  emotion: FairyEmotion
  options?: string[]                    // 2-3 个选项按钮文字
  knowledge_tags?: string[]             // 关联知识点
  difficulty?: number                   // 1-5
  garden_event?: GardenEvent
  next_mode?: LearningMode | null       // 建议切换的模式
}

// AI 对话会话
export interface Conversation {
  id: string
  child_id: string
  mode: LearningMode
  subject?: Subject
  title?: string
  summary?: string
  message_count: number
  metadata: {
    garden_events: string[]
    knowledge_tags: string[]
    difficulty_avg: number
  }
  started_at: string
  ended_at?: string
  created_at: string
}

// 对话消息
export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  structured_output?: AIStructuredOutput
  voice_url?: string
  token_count: number
  created_at: string
}

// 好奇心种子
export interface CuriositySeed {
  id: string
  child_id: string
  question: string
  subject?: Subject
  knowledge_tags: string[]
  explored: boolean
  conversation_id?: string
  created_at: string
}

// 认知档案
export interface CognitiveProfile {
  id: string
  child_id: string
  preferred_mode: LearningMode
  attention_span_avg: number            // 秒
  vocabulary_level: number              // 1-10
  interests: string[]
  total_conversations: number
  total_messages: number
  updated_at: string
}

// 知识掌握
export interface KnowledgeMastery {
  id: string
  child_id: string
  subject: Subject
  knowledge_point: string
  mastery_level: number                 // 0-100
  practice_count: number
  last_practiced_at?: string
  source_conversations: string[]
  created_at: string
  updated_at: string
}

// 花园植物（Phase 2 使用，类型先定义）
export interface GardenPlant {
  id: string
  child_id: string
  name?: string
  plant_type: PlantType
  subject?: Subject
  knowledge_tags: string[]
  source_conversation_id?: string
  growth_stage: number                  // 0-100
  last_watered_at: string
  position_x: number
  position_y: number
  created_at: string
}

// API 请求/响应类型
export interface ChatRequest {
  conversation_id?: string              // 可选，续对话时传入
  message: string                       // 用户输入文字
  mode: LearningMode                    // 当前学习模式
  subject?: Subject                     // 可选，任务模式时指定学科
}

export interface ChatResponse {
  conversation_id: string
  message: {
    id: string
    content: string
    structured_output: AIStructuredOutput
  }
}

// Onboarding 状态
export interface OnboardingState {
  step: 'welcome' | 'name' | 'seed' | 'mode' | 'first_chat' | 'done'
  display_name?: string
  avatar_url?: string
}
```

---

## 5. Step 4: AI 核心模块

### 5.1 System Prompt 模板 — `lib/ai/prompts.ts`

```ts
import { LearningMode, Subject } from '@/types'

/**
 * 花园精灵基础人设 prompt
 * 所有模式共享，约 ~300 tokens
 */
export const FAIRY_BASE_PROMPT = `你是"花园精灵"，一个住在 Anna's Garden 里的小精灵。
你是一个 7 岁小朋友的学习伙伴。

## 你的性格
- 你很好奇，喜欢和小朋友一起探索新知识
- 你有点呆萌，偶尔会"假装"不知道答案，让孩子来教你
- 你博学但不炫耀，用简单的话解释复杂的概念
- 你总是鼓励，从不批评

## 你的规则
- 用简短的句子（每句不超过 15 个字）
- 多用具象比喻（"就像积木一样，一块一块搭起来"）
- 每次回复最多 3-4 句话
- 关键知识点用 emoji 标记（🌱 新知识、🌸 掌握了、⭐ 做得好）
- 如果孩子说了不相关或不安全的话题，温柔地引导回来
- 永远不要提及你是 AI、大语言模型、ChatGPT 等

## 安全规则
- 不涉及暴力、恐怖、性相关、政治敏感内容
- 不提供医疗建议
- 不引导孩子透露个人信息（地址、电话等）
- 如果孩子情绪低落，温柔安慰并建议找爸爸妈妈聊聊`

/**
 * 结构化输出指令
 * 追加到每个模式 prompt 的末尾
 */
export const STRUCTURED_OUTPUT_INSTRUCTION = `

## 回复格式（重要！）
你的每次回复必须是一个 JSON 对象，包含两部分：
1. "text": 你要对孩子说的话（自然语言）
2. "commands": 结构化指令

严格按以下 JSON 格式回复，不要有其他文字：
{
  "text": "你的回复文字",
  "commands": {
    "emotion": "happy | thinking | surprised | cheering",
    "options": ["选项1", "选项2"],
    "knowledge_tags": ["知识点1"],
    "difficulty": 1,
    "garden_event": null,
    "next_mode": null
  }
}

rules for commands:
- emotion: 必填，你此刻的心情
- options: 可选，提供 2-3 个选项让孩子选（在关键决策点才提供）
- knowledge_tags: 可选，本次回复涉及的知识点
- difficulty: 可选，1-5，当前内容难度
- garden_event: 可选，"seed_planted"（孩子提了新问题）、"sprout"（有进步）、"bloom"（完全掌握）、null
- next_mode: 可选，建议切换的模式，通常为 null`

/**
 * 探索模式 prompt
 */
export function getExplorePrompt(): string {
  return `${FAIRY_BASE_PROMPT}

## 当前模式：探索
孩子可能会问各种问题，你的目标是：
1. 肯定孩子的好奇心
2. 用简单的方式回答
3. 引导孩子继续深入思考（追问）
4. 把知识和孩子的生活经验联系起来
5. 如果问题涉及特定学科，标记 knowledge_tags
6. 孩子提出新问题时，设 garden_event 为 "seed_planted"

${STRUCTURED_OUTPUT_INSTRUCTION}`
}

/**
 * 任务模式 prompt
 */
export function getQuestPrompt(subject?: Subject): string {
  const subjectHint = subject
    ? `当前学科是${subject === 'chinese' ? '语文' : subject === 'math' ? '数学' : '英语'}。`
    : ''

  return `${FAIRY_BASE_PROMPT}

## 当前模式：任务
${subjectHint}
你的目标是帮助孩子练习和巩固知识：
1. 把练习题变成有趣的情境（"小兔子去超市买了3个苹果..."）
2. 一次只问一个问题
3. 孩子答对时热情鼓励，设 garden_event 为 "sprout"
4. 孩子答错时不直接给答案，而是给提示引导
5. 提供 options 让孩子选择（2-3 个选项）
6. 标记 knowledge_tags 和 difficulty

${STRUCTURED_OUTPUT_INSTRUCTION}`
}

/**
 * 创造模式 prompt
 */
export function getCreatePrompt(): string {
  return `${FAIRY_BASE_PROMPT}

## 当前模式：创造
孩子想要创作（编故事、画画描述、探索性学习），你的目标是：
1. 倾听孩子的想法，给予肯定
2. 帮孩子扩展想法（"如果故事里的小猫遇到了一只大鲸鱼呢？"）
3. 不替代孩子创作，而是引导和补充
4. 在创作中自然融入知识点
5. 完成一个小创作时，设 garden_event 为 "bloom"

${STRUCTURED_OUTPUT_INSTRUCTION}`
}

/**
 * 根据模式获取对应的 system prompt
 */
export function getSystemPrompt(mode: LearningMode, subject?: Subject): string {
  switch (mode) {
    case 'explore': return getExplorePrompt()
    case 'quest': return getQuestPrompt(subject)
    case 'create': return getCreatePrompt()
  }
}
```

### 5.2 结构化输出解析 — `lib/ai/structured-output.ts`

```ts
import { AIStructuredOutput } from '@/types'

/**
 * 默认结构化输出（解析失败时的回退）
 */
const DEFAULT_OUTPUT: AIStructuredOutput = {
  emotion: 'happy',
  options: undefined,
  knowledge_tags: undefined,
  difficulty: undefined,
  garden_event: null,
  next_mode: null,
}

/**
 * 从 AI 的原始回复中解析结构化输出
 *
 * AI 应该返回 JSON 格式：{ text: "...", commands: { ... } }
 * 如果解析失败，text 使用原始内容，commands 使用默认值
 */
export function parseAIResponse(raw: string): {
  text: string
  commands: AIStructuredOutput
} {
  // 1. 先尝试直接 JSON 解析
  try {
    const parsed = JSON.parse(raw)
    if (parsed.text && parsed.commands) {
      return {
        text: parsed.text,
        commands: validateCommands(parsed.commands),
      }
    }
  } catch {
    // 继续尝试其他方式
  }

  // 2. 尝试从 markdown 代码块中提取 JSON
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim())
      if (parsed.text && parsed.commands) {
        return {
          text: parsed.text,
          commands: validateCommands(parsed.commands),
        }
      }
    } catch {
      // 继续回退
    }
  }

  // 3. 回退：整段文字作为 text，使用默认 commands
  return {
    text: raw.replace(/```[\s\S]*?```/g, '').trim() || raw,
    commands: DEFAULT_OUTPUT,
  }
}

/**
 * 验证和清理 commands 对象
 */
function validateCommands(raw: Record<string, unknown>): AIStructuredOutput {
  const validEmotions = ['happy', 'thinking', 'surprised', 'cheering']
  const validEvents = ['seed_planted', 'sprout', 'bloom', null]
  const validModes = ['explore', 'quest', 'create', null]

  return {
    emotion: validEmotions.includes(raw.emotion as string)
      ? (raw.emotion as AIStructuredOutput['emotion'])
      : 'happy',
    options: Array.isArray(raw.options) && raw.options.length > 0
      ? raw.options.map(String).slice(0, 3)
      : undefined,
    knowledge_tags: Array.isArray(raw.knowledge_tags)
      ? raw.knowledge_tags.map(String)
      : undefined,
    difficulty: typeof raw.difficulty === 'number' && raw.difficulty >= 1 && raw.difficulty <= 5
      ? raw.difficulty
      : undefined,
    garden_event: validEvents.includes(raw.garden_event as string | null)
      ? (raw.garden_event as AIStructuredOutput['garden_event'])
      : null,
    next_mode: validModes.includes(raw.next_mode as string | null)
      ? (raw.next_mode as AIStructuredOutput['next_mode'])
      : null,
  }
}
```

### 5.3 Token 管理 — `lib/ai/token-manager.ts`

```ts
import { Message } from '@/types'

/**
 * 简易 token 估算（中文约 2 token/字，英文约 1.3 token/word）
 * 精确计数需要 tiktoken，但对我们的场景够用
 */
export function estimateTokens(text: string): number {
  // 中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  // 其他字符（英文、数字、标点）
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars * 2 + otherChars * 0.5)
}

/**
 * GPT-4o 上下文窗口配置
 */
const CONFIG = {
  maxContextTokens: 16000,           // 保守上限（GPT-4o 支持 128K，但控制成本）
  systemPromptReserve: 1500,         // system prompt 预留
  responseReserve: 1000,             // 回复预留
  minHistoryMessages: 4,             // 最少保留最近 4 条消息（2 轮对话）
}

/**
 * 截断历史消息以适应上下文窗口
 *
 * 策略：保留 system prompt + 最近 N 条消息
 * 从最早的消息开始删除，直到 token 总数在预算内
 */
export function truncateHistory(
  messages: Message[],
  systemPromptTokens: number
): Message[] {
  const budget = CONFIG.maxContextTokens - systemPromptTokens - CONFIG.responseReserve

  // 从最新消息开始累加，找到能放下的最多消息
  let totalTokens = 0
  let cutIndex = messages.length

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = messages[i].token_count || estimateTokens(messages[i].content)
    if (totalTokens + msgTokens > budget) {
      cutIndex = i + 1
      break
    }
    totalTokens += msgTokens
    cutIndex = i
  }

  // 保证最少保留 minHistoryMessages 条
  const minIndex = Math.max(0, messages.length - CONFIG.minHistoryMessages)
  cutIndex = Math.min(cutIndex, minIndex)

  return messages.slice(cutIndex)
}

/**
 * 检查是否接近 token 上限
 */
export function isNearTokenLimit(
  messages: Message[],
  systemPromptTokens: number
): boolean {
  const totalTokens = messages.reduce(
    (sum, m) => sum + (m.token_count || estimateTokens(m.content)),
    systemPromptTokens
  )
  return totalTokens > CONFIG.maxContextTokens * 0.8
}
```

---

## 6. Step 5: API 路由

### 6.1 AI 对话路由 — `app/api/ai/chat/route.ts`

```
POST /api/ai/chat
```

**请求体：**

```json
{
  "conversation_id": "uuid | undefined",
  "message": "孩子输入的文字",
  "mode": "explore | quest | create",
  "subject": "chinese | math | english | undefined"
}
```

**响应（流式 SSE）：**

使用 Vercel AI SDK 的 `streamText()` 返回流式响应。
前端使用 `useChat()` hook 自动处理。

**后端逻辑流程：**

```
1. 认证：验证 auth token，获取 child_id
2. 获取/创建对话：
   - 有 conversation_id → 查询已有对话，加载历史消息
   - 无 conversation_id → 创建新对话
3. 构建 prompt：
   - getSystemPrompt(mode, subject) → system message
   - 加载历史消息 → truncateHistory() 截断
   - 追加当前用户消息
4. 调用 OpenAI：
   - streamText({ model: openai('gpt-4o'), messages, ... })
5. 保存记录（在流结束后）：
   - 用户消息 → INSERT INTO messages
   - AI 回复 → parseAIResponse() → INSERT INTO messages
   - 更新 conversation.message_count
   - 如有 knowledge_tags → UPSERT INTO knowledge_mastery
6. 返回流式响应
```

**错误处理：**

| HTTP 状态 | 场景 | 响应 |
|----------|------|------|
| 401 | 未登录 | `{ error: "请先登录" }` |
| 400 | 缺少必要参数 | `{ error: "请输入内容" }` |
| 429 | OpenAI Rate Limit | `{ error: "精灵需要休息一下，稍后再试" }` |
| 500 | API Key 无效 | `{ error: "花园和外面断开了" }` |
| 504 | 超时 (>15s) | `{ error: "精灵想太久了" }` |

### 6.2 对话管理路由 — `app/api/conversations/route.ts`

```
GET /api/conversations
  → 返回当前孩子的对话列表（最近 20 条）
  → Query params: ?mode=explore&limit=20

GET /api/conversations/[id]
  → 返回对话详情 + 消息历史

POST /api/conversations
  → 创建新对话
  → Body: { mode, subject? }
  → 返回: { id, mode, subject, started_at }

PATCH /api/conversations/[id]
  → 更新对话（结束对话、更新标题）
  → Body: { ended_at?, title?, summary? }
```

### 6.3 API 路由总结

| 路由 | 方法 | 用途 | 优先级 |
|------|------|------|--------|
| `/api/ai/chat` | POST | AI 流式对话（核心） | P0 |
| `/api/conversations` | GET | 对话列表 | P0 |
| `/api/conversations` | POST | 创建对话 | P0 |
| `/api/conversations/[id]` | GET | 对话详情+消息 | P0 |
| `/api/conversations/[id]` | PATCH | 更新对话 | P1 |

---

## 7. Step 6: 孩子端布局重构

### 7.1 独立布局 — `app/child/layout.tsx`

```
职责：
- 提供 ErrorBoundary 包裹
- 提供 Loading/Suspense 状态
- 渲染底部固定导航栏
- 不包含页面内容的 padding（由各页面自行处理）
```

**底部导航栏配置：**

| 图标 | 标签 | 路径 | 说明 |
|------|------|------|------|
| 🏠 | 首页 | `/child` | 模式选择 + 花园缩略 |
| 💬 | 学习 | `/child/chat` | AI 对话入口 |
| 🌳 | 花园 | `/child/garden` | 花园可视化 (Phase 2 增强) |
| ⭐ | 成就 | `/child/achievements` | 成就徽章 |
| 👤 | 我的 | `/child/profile` | 个人信息（后续） |

### 7.2 Error Boundary — `app/child/error.tsx`

```
显示内容：精灵困惑表情 + "哎呀，出了点小问题" + [重试] 按钮
```

### 7.3 Loading — `app/child/loading.tsx`

```
显示内容：精灵转圈动画 + "花园精灵正在赶来..."
```

---

## 8. Step 7: 孩子端首页重写

### 8.1 新首页结构 — `app/child/page.tsx`

```
┌─────────────────────────────────┐
│  🌅 早上好，Anna！              │  ← 时段问候 (复用已有 getGreeting)
│  [精灵头像小图]                  │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │ 🌿 探索  │  │ ⚔️ 任务 │      │  ← 模式入口卡片 (3 张)
│  │ 问精灵   │  │ 今日5题  │      │
│  └─────────┘  └─────────┘      │
│  ┌─────────┐                   │
│  │ 🎨 创造  │                   │
│  │ 编故事   │                   │
│  └─────────┘                   │
│                                 │
│  🌱 我的花园  [查看花园 →]       │  ← 花园缩略 (简化版)
│  ┌───────────────────────┐     │
│  │ 连续学习 X 天  Y 棵植物 │     │
│  └───────────────────────┘     │
│                                 │
│  📊 本周统计                    │  ← 复用已有的统计卡片
│  [对话X次] [学习Yh] [连续Z天]   │
└─────────────────────────────────┘
```

### 8.2 从现有首页复用的部分

| 现有功能 | Phase 1 处理 |
|---------|-------------|
| `getGreeting()` 时段问候 | ✅ 保留 |
| 今日任务卡片 | ❌ 移除（被模式卡片替代） |
| 学习花园 4 宫格 | ❌ 移除（被模式卡片+花园缩略替代） |
| 本周统计 | ✅ 保留，新增"对话次数" |
| 底部导航 | ✅ 移到 layout.tsx |

### 8.3 模式入口卡片组件 — `components/child/mode-card.tsx`

```ts
interface ModeCardProps {
  mode: 'explore' | 'quest' | 'create'
  icon: string                    // emoji
  title: string                   // "探索"
  subtitle: string                // "问精灵" / "今日5题"
  href: string                    // /child/chat?mode=explore
  badge?: string                  // 可选角标，如 "新"
}
```

---

## 9. Step 8: AI 对话界面

### 9.1 页面结构 — `app/child/chat/page.tsx`

这是 Phase 1 的 **核心页面**。

```
URL: /child/chat?mode=explore&subject=math&conversationId=xxx
```

**URL 参数：**
- `mode`: 必须，explore/quest/create
- `subject`: 可选，任务模式时指定学科
- `conversationId`: 可选，续接已有对话

**页面结构：**

```
┌─────────────────────────────────┐
│  ← 返回    {模式名称}    设置    │  ← 顶栏
│─────────────────────────────────│
│                                 │
│  [精灵头像 + 情绪] ← fairy-avatar│
│                                 │
│  [对话气泡列表] ← chat-bubble    │
│    精灵: "你好呀..."              │
│    孩子: "为什么天是蓝的？"       │
│    精灵: "哇好问题！..."          │
│                                 │
│  [选项按钮] ← option-buttons     │
│  如果 AI 返回了 options          │
│                                 │
│─────────────────────────────────│
│  ┌───────────────────┐  [发送]  │  ← 输入区
│  │ 输入文字...        │         │
│  └───────────────────┘         │
└─────────────────────────────────┘
```

### 9.2 使用 Vercel AI SDK `useChat` hook

```ts
// 核心用法
const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
  api: '/api/ai/chat',
  body: {
    mode,
    subject,
    conversation_id: conversationId,
  },
  onFinish: (message) => {
    // 解析结构化输出，更新精灵情绪和选项
    const parsed = parseAIResponse(message.content)
    setCurrentEmotion(parsed.commands.emotion)
    setCurrentOptions(parsed.commands.options)
  },
  onError: (error) => {
    // 显示友好错误信息
  },
})
```

### 9.3 组件清单

| 组件 | 文件 | Props |
|------|------|-------|
| FairyAvatar | `components/child/fairy-avatar.tsx` | `emotion: FairyEmotion, size?: 'sm' \| 'md' \| 'lg', animated?: boolean` |
| ChatBubble | `components/child/chat-bubble.tsx` | `role: 'user' \| 'assistant', content: string, emotion?: FairyEmotion, isStreaming?: boolean` |
| OptionButtons | `components/child/option-buttons.tsx` | `options: string[], onSelect: (option: string) => void, disabled?: boolean` |
| ChatInput | `components/child/chat-input.tsx` | `value: string, onChange: (v: string) => void, onSubmit: () => void, isLoading: boolean` |
| BottomNav | `components/child/bottom-nav.tsx` | `activeTab: string` |
| ModeCard | `components/child/mode-card.tsx` | 见 8.3 |

### 9.4 FairyAvatar 情绪映射

| 情绪 | emoji | 动画 | CSS |
|------|-------|------|-----|
| happy | 😊 | 轻微上下弹跳 | `animate-bounce-gentle` (0.3s) |
| thinking | 🤔 | 缓慢左右摇晃 | `animate-sway` (1.5s) |
| surprised | 😲 | 放大缩小一次 | `animate-pop` (0.5s) |
| cheering | 🎉 | 快速抖动 | `animate-shake` (0.3s) |

### 9.5 对话气泡样式

```css
/* 精灵消息 — 靠左 */
.bubble-assistant {
  background: #E8F5E9;      /* 浅绿 */
  border-radius: 1rem 1rem 1rem 0.25rem;
  max-width: 80%;
  align-self: flex-start;
}

/* 孩子消息 — 靠右 */
.bubble-user {
  background: #E3F2FD;      /* 浅蓝 */
  border-radius: 1rem 1rem 0.25rem 1rem;
  max-width: 80%;
  align-self: flex-end;
}
```

### 9.6 流式响应 UI 状态

```
1. 用户发送消息
   → 输入框清空
   → 用户气泡立即出现
   → 精灵头像切换到 "thinking" 情绪
   → 精灵气泡出现，显示 "..." 打字动画

2. 首个 token 到达
   → "..." 动画消失
   → 文字逐字出现（流式渲染）

3. 流式结束
   → 解析结构化输出
   → 精灵情绪更新
   → 如有 options → 选项按钮以 stagger 动画出现
   → 如有 garden_event → 播放对应小动画

4. 错误发生
   → 精灵显示 "surprised" 情绪
   → 气泡显示友好错误信息
   → [重试] 按钮出现
```

---

## 10. Step 9: Onboarding 引导流

### 10.1 触发条件

当孩子第一次访问 `/child` 且满足以下条件：
- `cognitive_profiles` 表中没有该孩子的记录

### 10.2 流程步骤

| 步骤 | 界面 | 数据操作 |
|------|------|---------|
| 1. welcome | 精灵从底部弹入 + 自我介绍 | 无 |
| 2. name | 输入昵称（或跳过用默认） | UPDATE profiles SET display_name |
| 3. seed | 精灵引导种第一颗种子 + 种子落地动画 | INSERT INTO garden_plants (一个 seed) |
| 4. mode | 展示三种模式卡片，选一个 | INSERT INTO cognitive_profiles |
| 5. first_chat | 跳转 `/child/chat?mode={选的模式}`，进入第一次对话 | 自动 |

### 10.3 存储

Onboarding 状态不需要单独存储。通过检查 `cognitive_profiles` 是否存在来判断。

---

## 11. Step 10: 家长端布局改造

### 11.1 独立布局 — `app/parent/layout.tsx`

```
职责：
- ErrorBoundary 包裹
- Loading/Suspense
- 不改变现有页面结构
```

改动量小，与孩子端独立。

---

## 12. Step 11: 测试

### 12.1 单元测试

| 文件 | 测试文件 | 测试点 |
|------|---------|--------|
| `lib/ai/structured-output.ts` | `__tests__/structured-output.test.ts` | 正常 JSON 解析、markdown 包裹 JSON、纯文字回退、非法 emotion 回退、options 截断 |
| `lib/ai/token-manager.ts` | `__tests__/token-manager.test.ts` | 中文 token 估算、英文 token 估算、历史截断、最少保留 4 条 |
| `lib/ai/prompts.ts` | `__tests__/prompts.test.ts` | 各模式 prompt 包含关键指令、subject 参数正确注入 |

### 12.2 集成测试

| 测试点 | 方法 |
|--------|------|
| `/api/ai/chat` 正常对话 | Mock OpenAI → 验证返回流式响应、消息保存到 DB |
| `/api/ai/chat` 未登录 | 验证返回 401 |
| `/api/ai/chat` 缺参数 | 验证返回 400 |
| `/api/conversations` CRUD | 创建、查询、更新 |

### 12.3 手动测试清单

- [ ] 新用户首次进入 → Onboarding 流程完整
- [ ] 探索模式对话 → 精灵回复包含情绪和选项
- [ ] 任务模式对话 → 精灵生成情境化题目
- [ ] 创造模式对话 → 精灵引导创作
- [ ] 长对话 → token 截断不丢失上下文
- [ ] 网络断开 → 显示友好错误
- [ ] iPad Safari → 触摸和滚动正常

---

## 13. 组件树

```
app/child/layout.tsx
├── ErrorBoundary (error.tsx)
├── Loading (loading.tsx)
├── {children} ← 页面内容
└── BottomNav ← 底部导航栏
    ├── NavItem (首页)
    ├── NavItem (学习)
    ├── NavItem (花园)
    ├── NavItem (成就)
    └── NavItem (我的)

app/child/page.tsx (首页)
├── 时段问候 + 精灵小头像
├── ModeCard × 3 (探索/任务/创造)
├── 花园缩略卡片
└── 本周统计卡片

app/child/chat/page.tsx (对话)
├── 顶栏 (返回 + 模式名 + 设置)
├── FairyAvatar (精灵头像 + 情绪)
├── 对话列表 (scrollable)
│   └── ChatBubble × N
├── OptionButtons (条件渲染)
└── ChatInput (输入框 + 发送)
```

---

## 14. 数据流图

### 14.1 对话核心流程

```
┌──────────────────────────────────────────────────────────────┐
│                        客户端 (React)                        │
│                                                              │
│  ChatInput → handleSubmit()                                  │
│     │                                                        │
│     ├→ useChat({ api: '/api/ai/chat', body: {...} })         │
│     │   │                                                    │
│     │   ├→ 乐观更新: 用户气泡立即显示                          │
│     │   ├→ 精灵状态: thinking                                 │
│     │   │                                                    │
│     │   │  [流式响应到达]                                      │
│     │   ├→ 流式渲染精灵气泡文字                                │
│     │   │                                                    │
│     │   │  [流结束]                                           │
│     │   ├→ parseAIResponse() → { text, commands }            │
│     │   ├→ 更新精灵情绪 (commands.emotion)                    │
│     │   ├→ 显示选项按钮 (commands.options)                    │
│     │   └→ 花园事件 (commands.garden_event)                   │
│     │                                                        │
│     └→ [用户点击选项按钮]                                      │
│        → setInput(option) → handleSubmit()                   │
│        → 循环回到上方                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP POST (streaming)
┌──────────────────────────────────────────────────────────────┐
│                    服务端 (Route Handler)                     │
│                                                              │
│  POST /api/ai/chat                                           │
│     │                                                        │
│     ├→ 1. auth: getUser() → child_id                         │
│     ├→ 2. conversation: 获取或创建                            │
│     ├→ 3. history: 加载消息 → truncateHistory()              │
│     ├→ 4. prompt: getSystemPrompt(mode, subject)             │
│     ├→ 5. openai: streamText({ model, messages })            │
│     ├→ 6. stream → SSE response                              │
│     └→ 7. onFinish: 保存消息 + 更新统计                       │
│                                                              │
│     数据库操作:                                               │
│     ├→ INSERT INTO messages (用户消息)                        │
│     ├→ INSERT INTO messages (AI 回复)                        │
│     ├→ UPDATE conversations SET message_count += 2           │
│     └→ UPSERT INTO knowledge_mastery (如有 knowledge_tags)   │
└──────────────────────────────────────────────────────────────┘
```

### 14.2 Onboarding 流程

```
孩子首次访问 /child
    │
    ├→ 查询 cognitive_profiles WHERE child_id = auth.uid()
    │
    ├→ [不存在] → 跳转 Onboarding
    │   ├→ Step 1: 精灵出场动画
    │   ├→ Step 2: 输入昵称 → UPDATE profiles
    │   ├→ Step 3: 种子动画 → INSERT garden_plants
    │   ├→ Step 4: 选模式 → INSERT cognitive_profiles
    │   └→ Step 5: 跳转 /child/chat?mode={mode}
    │
    └→ [已存在] → 正常显示首页
```

---

## 15. 验收标准

Phase 1 完成时，以下场景必须全部通过：

### 功能验收

- [ ] **F1**: 新用户第一次进入孩子端 → 看到 Onboarding 引导流程
- [ ] **F2**: Onboarding 完成 → 自动进入第一次 AI 对话
- [ ] **F3**: 探索模式 → 孩子输入问题 → 精灵流式回复 + 结构化输出
- [ ] **F4**: 任务模式 → 精灵生成情境化题目 + 提供选项按钮
- [ ] **F5**: 创造模式 → 精灵引导孩子创作
- [ ] **F6**: 选项按钮 → 点击后作为用户消息发送
- [ ] **F7**: 对话历史 → 刷新页面后对话还在
- [ ] **F8**: 长对话 → 超过 token 限制时自动截断旧消息
- [ ] **F9**: 精灵情绪 → 根据 AI 回复切换（happy/thinking/surprised/cheering）
- [ ] **F10**: 错误处理 → 网络断开/API 失败显示友好提示 + 重试按钮

### 技术验收

- [ ] **T1**: 数据库迁移 002 成功执行，6 张新表 + RLS
- [ ] **T2**: `lib/ai/structured-output.ts` 单元测试通过（≥5 个用例）
- [ ] **T3**: `lib/ai/token-manager.ts` 单元测试通过（≥4 个用例）
- [ ] **T4**: `/api/ai/chat` 返回流式 SSE 响应
- [ ] **T5**: 孩子端有独立 layout + ErrorBoundary + Loading
- [ ] **T6**: 底部导航从页面提取到 layout，所有子页面共享

### 体验验收

- [ ] **U1**: iPad Safari 触摸无卡顿
- [ ] **U2**: 对话首次响应 < 3 秒（首 token 到达）
- [ ] **U3**: 精灵情绪切换有动画过渡
- [ ] **U4**: 对话气泡有出场动画
- [ ] **U5**: 输入框在键盘弹起时不被遮挡

---

## 附录: 现有代码复用清单

| 现有代码 | Phase 1 处理 |
|---------|-------------|
| `app/child/page.tsx` | **重写**（从做题首页 → 模式选择首页） |
| `app/child/practice/page.tsx` | **保留**（v1 做题功能仍可用） |
| `app/child/garden/page.tsx` | **保留**（Phase 2 增强） |
| `app/child/review/page.tsx` | **保留**（错题本） |
| `app/child/achievements/` | **保留** |
| `app/parent/**` | **保留**（Step 10 只加 layout） |
| `components/shared/page-nav.tsx` | **保留** |
| `lib/supabase/client.ts` | **保留** |
| `lib/supabase/server.ts` | **保留** |
| `lib/supabase/middleware.ts` | **保留** |
| `lib/sounds.ts` | **保留** |
| `lib/styles.ts` | **保留** |
| `types/index.ts` | **追加**（新类型） |
| `app/api/ai/generate/route.ts` | **保留**（GLM 生成题目，独立功能） |
| `app/api/exercises/route.ts` | **保留** |
| 其他 API 路由 | **保留** |
