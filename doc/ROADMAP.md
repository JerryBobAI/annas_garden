# Anna's Garden - AI 原生教育技术路线图

> 基于 VISION.md 决策 (2026-05-24) 制定
> 最后更新：2026-05-27
> 状态：Phase 1–4 + 体验打磨全部完成

---

## 总体策略

**渐进式重构**：不推倒重来，在现有代码基础上分阶段引入 AI 能力。
每个阶段交付可用的功能增量，Anna 可以边用边迭代。

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
技术债务修复   AI 对话核心   语音交互     创造模式     智能课程引擎
(融入P1) ✅   ✅ (05-24)    ✅ (05-25)   ✅ (05-25)   ✅ (05-26)
```

---

## Phase 0：基础修复与架构准备（约 1 周）

> 目标：稳定现有功能，为 AI 能力做好架构准备

### 0.1 代码层修复

- [x] **家长端/孩子端添加独立 layout.tsx** ✅
  - `app/parent/layout.tsx` — 家长端导航栏
  - `app/child/layout.tsx` — 孩子端底部 Tab + 花园精灵浮窗入口
  - 消除各页面中的重复导航代码

- [x] **添加 error.tsx / loading.tsx** ✅
  - 全局 + 各路由组独立的错误/加载状态
  - 治愈风格的错误页面（花园精灵安慰语）

- [x] **关键页面改为 Server Component** ✅（2026-05-27）
  - `app/parent/goals/page.tsx` → 服务端数据预取
  - `app/parent/dashboard/page.tsx` → 服务端数据预取
  - 客户端交互委托给 `dashboard-client.tsx` / `goals-client.tsx`

### 0.2 数据库扩展（为 AI 对话准备）

- [x] **新增对话相关表** ✅（002_ai_conversations.sql）

  ```sql
  -- 对话会话
  CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id),
    mode TEXT NOT NULL CHECK (mode IN ('explore', 'quest', 'create')),
    subject TEXT CHECK (subject IN ('chinese', 'math', 'english', 'general')),
    title TEXT,                    -- AI 自动生成的会话标题
    summary TEXT,                  -- AI 生成的会话摘要
    knowledge_points TEXT[],       -- 本次涉及的知识点
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'    -- 扩展字段
  );

  -- 对话消息
  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'image', 'option')),
    options JSONB,                 -- 选项型消息的选项数据
    selected_option TEXT,          -- 孩子选了哪个
    metadata JSONB DEFAULT '{}',   -- 附加数据（知识点标记、情绪标记等）
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- 好奇心种子（孩子主动提出的问题）
  CREATE TABLE curiosity_seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id),
    question TEXT NOT NULL,        -- 孩子问的原始问题
    topic TEXT,                    -- AI 分类的话题
    conversation_id UUID REFERENCES conversations(id),
    explored_depth INTEGER DEFAULT 0, -- 探索深度（追问了几轮）
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [x] **新增认知档案表** ✅（002_ai_conversations.sql）

  ```sql
  -- 孩子的认知档案（AI 持续更新）
  CREATE TABLE cognitive_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
    interests TEXT[],              -- AI 识别的兴趣点
    strengths TEXT[],              -- 强项
    growth_areas TEXT[],           -- 成长空间
    learning_style TEXT,           -- 学习风格偏好
    current_level JSONB,           -- 各学科当前水平评估
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- 知识点掌握度（比 wrong_answers 更细粒度）
  CREATE TABLE knowledge_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id),
    subject TEXT NOT NULL,
    knowledge_point TEXT NOT NULL,
    mastery_level REAL DEFAULT 0,  -- 0-1 掌握度
    confidence REAL DEFAULT 0,     -- AI 对该评估的置信度
    last_assessed_at TIMESTAMPTZ DEFAULT now(),
    evidence JSONB DEFAULT '[]',   -- 评估依据（哪些对话支撑了这个判断）
    UNIQUE(child_id, subject, knowledge_point)
  );
  ```

### 0.3 项目配置

- [x] **安装 AI 相关依赖** ✅
  - `ai` (Vercel AI SDK — 统一的 LLM 流式接口)
  - `openai` (OpenAI SDK)
  - `zod` (API 入参校验)

- [x] **环境变量补充** ✅
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (默认 `gpt-4o`)
  - `TTS_PROVIDER` / `STT_PROVIDER`

---

## Phase 1：AI 对话核心（约 2-3 周）

> 目标：孩子可以和花园精灵进行文字对话（三科），对话中嵌入知识点

### 1.1 花园精灵 AI 引擎

- [x] **System Prompt 设计** ✅（lib/ai/prompts.ts）

  精灵需要三套人格 prompt：
  - `explore` — 好奇心陪伴者：引导追问，展开联想
  - `quest` — 温柔的引导者：情境化出题，苏格拉底式追问思路
  - `create` — 创意伙伴：辅助创作，提供灵感，不代替孩子

  通用约束：
  - 语言水平：一年级能听懂的词汇和句式
  - 安全护栏：不涉及暴力/恐怖/不适合儿童的内容
  - 学科知识：基于学期大纲（作为 context 注入）
  - 性格：混合（可爱呆萌 × 聪明博学），偶尔犯小错让孩子纠正
  - 对话长度：每轮回复不超过 3-4 句（孩子注意力有限）

- [x] **API 路由：流式对话** ✅（/api/ai/chat）
  - `POST /api/ai/chat` — 流式响应（Vercel AI SDK useChat）
  - 输入：conversation_id, message, mode, subject
  - 输出：SSE 流式文字 + 结构化指令（如"显示选项"、"显示图片"）
  - 自动保存对话到 conversations / messages 表

- [x] **AI 结构化输出** ✅

  AI 不只返回纯文字，还返回结构化指令：
  ```json
  {
    "text": "哇，你用了破十法！那如果是 16-9 呢？",
    "actions": [
      { "type": "option", "options": ["5", "6", "7", "8"] },
      { "type": "knowledge_tag", "point": "20以内退位减法-破十法" },
      { "type": "emotion", "mood": "encouraging" }
    ]
  }
  ```

### 1.2 孩子端对话 UI

- [x] **对话页面 `app/child/chat/page.tsx`** ✅
  - 聊天气泡界面（精灵在左，Anna 在右）
  - 精灵头像（动态，根据情绪变化表情）
  - 流式文字显示（逐字出现）
  - 底部输入区：文字输入框 + 语音按钮（Phase 2 启用）+ 发送按钮
  - 关键节点显示可点选的选项卡片
  - 消息支持富文本（图片、公式、拼音注音）

- [x] **花园精灵浮窗** ✅（集成在 layout 底部导航）
  - 屏幕右下角常驻的精灵小头像（类似客服 widget）
  - 点击展开对话面板
  - 在任何页面都能唤起精灵

- [x] **首页改造** ✅
  - 孩子首页从"任务列表"变为"花园世界入口"
  - 精灵问候 + 今日推荐 + 快捷入口

### 1.3 家长端 AI 报告

- [x] **成长报告页面** ✅（app/parent/dashboard/page.tsx AI 洞察面板）
  - 替代（或增强）现有的 dashboard
  - 展示 AI 生成的每日/每周成长笔记
  - 好奇心种子列表（Anna 问了什么）
  - 知识点掌握度图谱
  - 建议和洞察

- [x] **API 路由：生成报告** ✅（/api/reports/generate）
  - `POST /api/ai/report` — 基于最近对话生成家长报告
  - 输入：child_id, date_range
  - 输出：结构化报告 JSON

### 1.4 学校内容导入（文本优先）

- [x] **家长端内容导入** ✅（app/parent/content/import/page.tsx）
  - 文本粘贴框：家长贴入课本内容/知识点文本
  - AI 自动解析 → 提取知识点 → 注入到精灵的知识库
  - PDF 上传（V1 实现，用 pdf-parse 提取文字）

---

## Phase 2：语音交互（约 1-2 周）

> 目标：Anna 可以用说话的方式和精灵交流

### 2.1 语音输入（STT）

- [x] **Web Speech API 集成** ✅（browser-speech.ts）
  - 长按说话 / 点击开始-点击结束
  - 实时显示识别中的文字
  - 识别完成 → 自动发送给 AI

- [x] **Whisper API 备选** ✅（SiliconFlow SenseVoice / OpenAI Whisper）
  - 如果 Web Speech API 中文识别不够准
  - 录音 → 上传 → Whisper 转文字 → 发送给 AI
  - 延迟略高但准确度更好

### 2.2 语音输出（TTS）

- [x] **AI 回复自动朗读** ✅（SiliconFlow CosyVoice2 / OpenAI TTS）
  - OpenAI TTS API（声音自然，可选儿童友好的声音）
  - 或 Web Speech API（免费但声音较机械）
  - 精灵说话时头像有口型/表情动画
  - 可以关闭自动朗读（家长设置）

### 2.3 语音 UX 优化

- [x] **对话模式切换** ✅
  - 纯文字模式（安静环境/公共场合）
  - 语音模式（正常使用）
  - 混合模式（语音输入，文字也显示）
  - 孩子自己切换，记住偏好

---

## Phase 3：创造模式（约 2-3 周）

> 目标：Anna 可以在精灵帮助下创作故事、探索数学、学习英语

### 3.1 故事创作（语文）

- [x] **看图说话** ✅（故事创造模式）
  - AI 生成/选择一幅图片
  - Anna 口述或打字描述
  - 精灵引导扩展：「然后呢？」「小猫是什么颜色的？」
  - 最终整理成一个小故事（可以分享给家长）

- [x] **续写故事** ✅（故事创造模式）
  - 精灵开头：「从前，在一个花园里……」
  - Anna 接着编：「住着一只小兔子！」
  - 精灵继续推动情节 + 引入生字
  - 生成绘本格式（配 AI 插图）

### 3.2 数学探索

- [x] **情境化数学任务** ✅（数学探索模式）
  - 精灵讲一个小故事 → 自然引出数学问题
  - 开放式回答：「你觉得怎么算？」
  - AI 追问思考过程而非只看答案
  - 错了不说"错了"，而是引导：「嗯，让我们再想想……」

### 3.3 英语冒险

- [x] **角色扮演对话** ✅（英语冒险模式）
  - 精灵扮演不同角色：「I'm a cat! What's your name?」
  - Anna 用英语回答（语音或文字）
  - 自然拼读练习嵌入对话中
  - 学唱英文歌谣（精灵唱一句，Anna 跟唱）

---

## Phase 4：花园世界 + 智能课程引擎（持续迭代）

> 目标：花园真正成为一个可探索的视觉世界

### 4.1 花园世界 UI

- [x] **可视化花园地图** ✅（2D 画布 + 四季主题 + 学科区域分区 + 解锁机制）
  - 故事小屋 / 数字森林 / 彩虹桥 / 好奇心角落 / 创意工坊
  - 点击区域 → 进入对应学习模式
  - 植物/花朵 = 已掌握的知识点
  - 天气/光照 = 学习状态

- [x] **花园精灵动态头像** ✅（SVG + CSS 动画 + framer-motion 情绪切换）
  - 多种表情状态：开心、思考、惊讶、鼓励、犯傻
  - 根据对话上下文自动切换

### 4.2 智能课程引擎

- [x] **知识图谱自动调度** ✅（knowledge-graph.ts）
  - 学期大纲 → 知识点依赖图
  - AI 根据掌握度自动选择下一个知识点
  - 在不同模式中嵌入（探索时自然引出，任务时直接练习）

- [x] **艾宾浩斯复习调度** ✅（spaced-repetition.ts + 对话自然注入）
  - 知识点 + 掌握度 + 时间衰减 → 自动复习
  - 精灵自然提起：「上次那个减法问题，你还记得吗？」

---

## Phase 5：MVP Trial & Launch（2026-Q2，进行中）

> 目标：工程硬化 + 对外宣发 + 5 家庭试用

- [x] Jest 排除 E2E 误扫 + CI 增加 unit/lint
- [x] API 限流（chat/image/voice/reports）
- [x] 内容安全兜底（输入拦截 + 输出净化）
- [x] 宣发 Landing Page（`/` 未登录可见）
- [x] `.env.local.example` 与 README 同步
- [ ] Supabase Storage 图片持久化
- [ ] 试用 onboarding 向导（家长首次配置）
- [ ] 5 家庭试用 + 反馈收集

## Phase 6：V1.0 产品化（2026-Q3）

- Moderation API（第三方内容审核）
- 花园地图式首页（贴近「花园即应用」愿景）
- 邀请码 / waitlist 注册
- 品牌 OG 图与案例故事

---

## 技术架构总图（Phase 1 之后）

```
┌──────────────── 前端（Next.js 16 App Router）────────────────┐
│                                                              │
│  孩子端                          家长端                       │
│  ├─ 花园世界（首页/地图）         ├─ 成长洞察（AI 报告）       │
│  ├─ AI 对话（chat）              ├─ 学期设置（目标/偏好）     │
│  ├─ 创造工坊                     ├─ 内容导入（文本/PDF）      │
│  └─ 花园精灵浮窗                 └─ 对话回看                  │
│                                                              │
│  共享组件                                                    │
│  ├─ 精灵头像（动态表情）                                     │
│  ├─ 对话气泡 + 选项卡片                                      │
│  ├─ 语音输入按钮                                             │
│  └─ 音效系统（已有）                                         │
│                                                              │
├──────────────── API 层 ──────────────────────────────────────┤
│                                                              │
│  /api/ai/chat         流式 AI 对话（Vercel AI SDK）          │
│  /api/ai/report       生成家长报告                           │
│  /api/ai/import       内容导入解析                           │
│  /api/conversations   对话 CRUD                              │
│  /api/voice/stt       语音转文字（Whisper）                  │
│  /api/voice/tts       文字转语音（OpenAI TTS）               │
│  /api/existing...     保留现有 API                           │
│                                                              │
├──────────────── AI 引擎 ─────────────────────────────────────┤
│                                                              │
│  System Prompt 管理器                                        │
│  ├─ 基础人格 prompt（花园精灵 · 小叶子）                     │
│  ├─ 模式 prompt（探索/任务/创造）                            │
│  ├─ 学科 prompt（语文/数学/英语）                            │
│  ├─ 上下文注入（学期大纲 + 孩子认知档案 + 最近对话）         │
│  └─ 安全护栏 prompt                                         │
│                                                              │
│  结构化输出解析器                                            │
│  ├─ 文字内容提取                                             │
│  ├─ 选项/动作指令解析                                        │
│  ├─ 知识点标记提取                                           │
│  └─ 情绪标记提取                                             │
│                                                              │
├──────────────── 数据层（Supabase）───────────────────────────┤
│                                                              │
│  现有表（保留）                    新增表                     │
│  ├─ profiles                     ├─ conversations            │
│  ├─ semesters                    ├─ messages                 │
│  ├─ learning_goals               ├─ curiosity_seeds          │
│  ├─ materials                    ├─ cognitive_profiles        │
│  ├─ exercises                    └─ knowledge_mastery        │
│  ├─ learning_records                                         │
│  ├─ wrong_answers                                            │
│  └─ ...                                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 依赖与成本估算

### 新增依赖

| 包名 | 用途 | 备注 |
|------|------|------|
| `ai` | Vercel AI SDK，统一的 LLM 流式接口 | 支持 OpenAI/Anthropic/等 |
| `openai` | OpenAI API 调用 | GPT-4o + TTS + Whisper |
| `zod` | API 入参校验 | Phase 0 引入 |
| `pdf-parse` | PDF 文字提取 | Phase 1 学校内容导入 |
| `lottie-react` | 精灵头像动画 | Phase 4 或更早 |

### AI API 成本估算（个人使用）

| API | 单价 | 日用量估算 | 月成本 |
|-----|------|-----------|--------|
| GPT-4o 输入 | $2.5/1M tokens | ~5000 tokens/天 | ~$0.4 |
| GPT-4o 输出 | $10/1M tokens | ~3000 tokens/天 | ~$0.9 |
| Whisper STT | $0.006/分钟 | ~10 分钟/天 | ~$1.8 |
| TTS | $15/1M chars | ~2000 字/天 | ~$0.9 |
| **合计** | | | **~$4/月** |

> 个人使用的 AI 成本非常低，完全可控。

---

## 实际进展

| Phase | 完成日期 | 关键成果 |
|-------|----------|----------|
| Phase 0 | 2026-05-24 | 融入 Phase 1，技术债务同步解决 |
| Phase 1 | 2026-05-24 | AI 对话核心、孩子端重写、结构化输出、18 测试用例 |
| Phase 2 | 2026-05-25 | 多 Provider 语音交互、花园可视化、41 测试用例 |
| Phase 3 | 2026-05-25 | 创造模式（故事/数学/英语）、创作保存与花园联动 |
| Phase 4 | 2026-05-27 | 知识图谱推荐、AI 周报、花园四季+多区域、PDF 导入、定时报告、143 测试 |

### Phase 4 交付摘要

- **智能引擎**：`/api/recommendations`、自适应难度、认知档案自动更新
- **家长洞察**：`/api/reports/generate`、学习报告看板、PIN 验证门禁
- **家长端升级（§14）**：首页实时统计 + AI 快报、目标掌握度、计划 AI 推荐、设置导出/认知档案、内容导入入口
- **花园增强**：四季主题（season.ts）、学科区域分区（areas.ts）、区域解锁机制、学科×阶段独立 emoji
- **PDF 导入**：pdf-parse v2 + multipart upload API + 文本/PDF tab 切换 UI
- **定时报告**：report-scheduler.ts + Vercel Cron 每周一 08:00 + 按需触发

### 体验打磨批次（2026-05-27）

- **T1**: Server Component 重构（dashboard + goals）
- **T5**: zod 入参校验（`lib/api/validation.ts`）
- **T11**: PWA 配置（manifest + apple-web-app + viewport）
- **T14**: 恢复 reactStrictMode: true

**当前状态（2026-05-29）：Phase 1–4 全部完成；Phase 5 MVP Trial 工程硬化进行中。220+ 单元测试、68 E2E、宣发 Landing 已就绪。**
