# Phase 2 实施规格 — 语音交互 + 基础花园可视化

> 最后更新：2026-05-25
>
> 前置条件：Phase 1 全部完成（AI 对话核心 + 孩子端重写）

---

## 目录

1. [实施总览与依赖顺序](#1-实施总览与依赖顺序)
2. [Step 1: 新增依赖](#2-step-1-新增依赖)
3. [Step 2: 语音录制组件](#3-step-2-语音录制组件)
4. [Step 3: 语音识别 API (STT)](#4-step-3-语音识别-api-stt)
5. [Step 4: 语音合成 API (TTS)](#5-step-4-语音合成-api-tts)
6. [Step 5: 对话界面语音集成](#6-step-5-对话界面语音集成)
7. [Step 6: 花园数据层](#7-step-6-花园数据层)
8. [Step 7: 花园界面](#8-step-7-花园界面)
9. [Step 8: 花园与对话联动](#9-step-8-花园与对话联动)
10. [Step 9: 测试](#10-step-9-测试)
11. [数据流图](#11-数据流图)
12. [验收标准](#12-验收标准)

---

## 1. 实施总览与依赖顺序

```
Phase 1 完成 ──────────────────────────────────────────────┐
                                                            │
Step 1: 新增依赖 ─────────────────────────────────────────┐ │
Step 2: 语音录制组件 ←── 纯前端，无后端依赖                 │ │
Step 3: STT API 路由 ←── 依赖 Step 1 (openai 包)           │ │
Step 4: TTS API 路由 ←── 依赖 Step 1                       │ │
Step 5: 对话界面集成 ←── 依赖 Step 2 + 3 + 4              ─┘ │
                                                              │
Step 6: 花园数据层 ←── 依赖 Phase 1 garden_plants 表        ──┘
Step 7: 花园界面 ←──── 依赖 Step 6
Step 8: 花园联动 ←──── 依赖 Step 5 + Step 7
Step 9: 测试 ←──────── 依赖全部完成
```

**两条并行线**：
- **语音线** (Step 2-5)：录音 → STT → TTS → 集成到对话
- **花园线** (Step 6-8)：数据层 → UI → 联动

---

## 2. Step 1: 新增依赖

Phase 1 已安装 `ai` 和 `@ai-sdk/openai`，Phase 2 新增 `openai` 包用于 Whisper STT。

语音录制使用浏览器原生 API：
- **Web Audio API** — 音频处理和波形可视化
- **MediaRecorder API** — 录音

### 环境变量

| 变量 | 说明 |
|------|------|
| `VOICE_PROVIDER` | 语音方案：`browser`（零成本）/ `siliconflow`（推荐）/ `openai`（付费） |
| `SILICONFLOW_API_KEY` | 硬基流动 API Key（免费注册 siliconflow.cn） |
| `OPENAI_API_KEY` | OpenAI API Key（可选，付费但质量最高） |

> 💡 不配任何 Key 时自动使用浏览器内置 Web Speech API，完全免费。

### 实际实现：多 Provider 抽象层

```
lib/voice/config.ts       — Provider 配置与自动检测
lib/voice/browser-speech.ts — 浏览器原生 Web Speech API 实现
app/api/voice/provider/route.ts — 前端查询当前 Provider
```

Provider 优先级：siliconflow > openai > browser（根据环境变量和 API Key 自动选择）

---

## 3. Step 2: 语音录制组件

### 3.1 VoiceButton — `components/child/voice-button.tsx`

**交互设计：按住录音 → 松开发送**

```ts
interface VoiceButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void
  disabled?: boolean
  maxDuration?: number          // 最长录音秒数，默认 60
}

interface VoiceButtonState {
  status: 'idle' | 'recording' | 'processing'
  duration: number              // 已录制秒数
  amplitude: number             // 当前音量 0-1（用于波形动画）
}
```

**实现要点：**

```
1. touchstart / mousedown → 开始录音
   - navigator.mediaDevices.getUserMedia({ audio: true })
   - 创建 MediaRecorder (mimeType: 'audio/webm' 优先，fallback 'audio/mp4')
   - 创建 AudioContext + AnalyserNode 用于波形
   - 状态 → 'recording'

2. 录音中
   - requestAnimationFrame 循环读取 AnalyserNode frequency data
   - 计算平均振幅 → amplitude state → 驱动 UI 波形动画
   - 计时器显示录音时长
   - 到达 maxDuration 自动停止

3. touchend / mouseup → 停止录音
   - MediaRecorder.stop()
   - 收集 dataavailable 事件中的 chunks → Blob
   - 调用 onRecordingComplete(blob)
   - 状态 → 'processing'

4. 取消（手指滑出按钮区域）
   - 不发送，丢弃录音
```

**UI 样式：**

```
正常状态:
  圆形按钮 64×64px
  🎤 图标居中
  背景色: #FFB300 (琥珀黄)
  阴影: soft shadow

录音中:
  放大到 80×80px (scale transition 0.2s)
  背景色: #EF5350 (红色指示)
  外圈脉冲动画 (pulse ring)
  波形可视化环绕按钮
  时长文字显示在按钮上方 "0:05"

处理中:
  缩回 64×64px
  显示旋转加载动画
  "精灵在听..." 文字
```

### 3.2 录音权限处理

```ts
// 首次使用前检查权限
async function checkMicPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state
  } catch {
    return 'prompt' // 部分浏览器不支持 permissions API
  }
}
```

**权限被拒绝时的 UI：**
> 精灵说："我听不到你说话哦 🙉 让爸爸妈妈帮你打开麦克风权限吧！"
> [打开设置] 按钮

---

## 4. Step 3: 语音识别 API (STT)

### 4.1 API 路由 — `app/api/voice/stt/route.ts`

```
POST /api/voice/stt
Content-Type: multipart/form-data
```

**请求体：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `audio` | File (Blob) | 音频文件（webm 或 mp4） |
| `language` | string | 可选，`zh` / `en`，默认自动检测 |

**响应：**

```json
{
  "text": "为什么天是蓝的",
  "language": "zh",
  "duration": 3.2
}
```

**后端逻辑：**

```
1. 认证检查
2. 从 FormData 提取 audio file
3. 验证文件大小 (≤ 25MB，Whisper 限制)
4. 调用 OpenAI Whisper API:
   openai.audio.transcriptions.create({
     file: audioFile,
     model: 'whisper-1',
     language: language || undefined,    // undefined = auto-detect
     response_format: 'json',
   })
5. 返回 { text, language, duration }
```

**错误处理：**

| 场景 | HTTP | 响应 |
|------|------|------|
| 未登录 | 401 | `{ error: "请先登录" }` |
| 无音频文件 | 400 | `{ error: "没有收到音频" }` |
| 文件太大 | 413 | `{ error: "录音太长了" }` |
| 识别失败/空结果 | 200 | `{ text: "", language: "unknown" }` — 前端显示"没听清" |
| Whisper API 错误 | 502 | `{ error: "精灵的耳朵暂时不太灵" }` |
| 超时 (>10s) | 504 | `{ error: "听了太久了" }` |

### 4.2 Whisper 注意事项

- 儿童语音特点：语速慢、发音不标准、背景噪音
- Whisper 对中文儿童语音识别率约 85-90%，可接受
- `language: 'zh'` 可提升中文场景的准确率
- 英语模式时切换 `language: 'en'`

---

## 5. Step 4: 语音合成 API (TTS)

### 5.1 API 路由 — `app/api/voice/tts/route.ts`

```
POST /api/voice/tts
Content-Type: application/json
```

**请求体：**

```json
{
  "text": "哇，这是个好问题！天空是蓝的...",
  "voice": "nova"
}
```

**响应：**

```
Content-Type: audio/mpeg
Body: 音频二进制数据 (streaming)
```

**后端逻辑：**

```
1. 认证检查
2. 验证 text 不为空且长度 ≤ 4096 字符
3. 调用 OpenAI TTS API:
   openai.audio.speech.create({
     model: 'tts-1',              // tts-1 延迟低，tts-1-hd 质量高但慢
     voice: voice || 'nova',       // nova: 温暖友好的女声
     input: text,
     response_format: 'mp3',
   })
4. 流式返回音频数据
```

**Voice 选择：**

| Voice ID | 特点 | 适合场景 |
|----------|------|---------|
| `nova` | 温暖、友好的女声 | **默认精灵语音** ← 推荐 |
| `shimmer` | 柔和、温柔 | 备选 |
| `alloy` | 中性、平衡 | 如果 nova 不满意 |

> 建议：先用 nova，后续让用户/Anna 试听选择。

**错误处理：**

| 场景 | HTTP | 响应 |
|------|------|------|
| 文字为空 | 400 | `{ error: "没有内容可以说" }` |
| 文字过长 | 400 | `{ error: "精灵说不了这么多话" }` |
| TTS API 错误 | 502 | `{ error: "精灵的嗓子暂时哑了" }` |

### 5.2 前端音频播放 — `lib/audio-player.ts`

> 实际实现中增加了 AudioContext 解锁、自动释放、错误处理等增强。

```ts
/**
 * 播放来自 API 的流式音频
 */
export async function playAudioFromResponse(response: Response): Promise<void> {
  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)
  const audio = new Audio(audioUrl)

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      resolve()
    }
    audio.onerror = reject
    audio.play()
  })
}

/**
 * 语音设置（用户可调整）
 */
export interface VoiceSettings {
  autoPlay: boolean             // 是否自动播放 AI 回复语音
  volume: number                // 0-1
  speed: number                 // 0.5-2.0，默认 1.0
}
```

---

## 6. Step 5: 对话界面语音集成

### 6.1 对话输入区改造

Phase 1 的对话输入区只有文字输入框。Phase 2 加入语音按钮：

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────────────┐  [🎤]  [发送] │
│  │ 输入文字...           │              │
│  └──────────────────────┘              │
│                                         │
└─────────────────────────────────────────┘

录音中：
┌─────────────────────────────────────────┐
│                                         │
│       [🔴 0:05 松开发送 / 滑开取消]      │
│       ~~~ 波形动画 ~~~                   │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 完整语音对话链路

```ts
async function handleVoiceMessage(audioBlob: Blob) {
  // 1. 语音识别
  setVoiceStatus('recognizing')     // 精灵显示"在听..."
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('language', currentMode === 'english' ? 'en' : 'zh')

  const sttRes = await fetch('/api/voice/stt', { method: 'POST', body: formData })
  const { text } = await sttRes.json()

  if (!text) {
    // 识别失败 → 显示友好提示
    showFairyMessage("没听清呢，再说一次？🙉")
    return
  }

  // 2. 显示识别到的文字
  setInput(text)

  // 3. 发送给 AI（复用 Phase 1 的 handleSubmit）
  handleSubmit()    // 这会触发 /api/ai/chat 流式对话

  // 4. AI 回复完成后，自动播放语音
  // 在 useChat 的 onFinish 回调中：
  //   const ttsRes = await fetch('/api/voice/tts', {
  //     method: 'POST',
  //     body: JSON.stringify({ text: parsedText, voice: 'nova' })
  //   })
  //   await playAudioFromResponse(ttsRes)
}
```

### 6.3 延迟预算管理

```
┌──────────────────────────────────────────────────────────┐
│  孩子说话  → STT (1-3s) → AI 思考 (0.5-1s) → 流式输出   │
│                                                          │
│  精灵动画: "在听..." → "在想..." → 文字逐字出现          │
│                                                          │
│  → 流式结束 → TTS (1-2s) → 播放语音                      │
│                                                          │
│  全链路: 3-6秒（有持续动画反馈）                          │
└──────────────────────────────────────────────────────────┘
```

**关键优化：TTS 与文字显示并行**
- 不等 TTS 完成才显示文字
- 文字先流式显示，TTS 在流结束后请求并播放
- 用户看到文字时已经理解内容，语音是增强体验

---

## 7. Step 6: 花园数据层

### 7.1 数据库

Phase 1 已创建 `garden_plants` 表，Phase 2 直接使用，无需新迁移。

表结构回顾（来自 002 迁移）：
- `id`, `child_id`, `name`, `plant_type` (seed/sprout/growing/blooming/withered)
- `subject`, `knowledge_tags`, `source_conversation_id`
- `growth_stage` (0-100), `last_watered_at`
- `position_x`, `position_y`

### 7.2 花园 API — `app/api/garden/route.ts`

```
GET /api/garden
  → 返回当前孩子的所有植物
  → 可选 query: ?subject=math

GET /api/garden/stats
  → 花园统计（植物总数、各阶段分布、学科分布）

PATCH /api/garden/[id]
  → 更新植物（改名、浇水等）
  → Body: { name?, position_x?, position_y? }
```

### 7.3 植物成长逻辑 — `lib/garden/growth.ts`

```ts
/**
 * 根据 AI 对话中的 garden_event 更新植物状态
 */
export function processGardenEvent(
  event: 'seed_planted' | 'sprout' | 'bloom',
  conversationId: string,
  knowledgeTags: string[],
  subject?: Subject
): GardenAction {
  switch (event) {
    case 'seed_planted':
      return {
        type: 'create',
        plant: {
          plant_type: 'seed',
          growth_stage: 0,
          subject,
          knowledge_tags: knowledgeTags,
          source_conversation_id: conversationId,
        }
      }

    case 'sprout':
      return {
        type: 'upgrade',
        // 找到最近一棵与知识点相关的 seed/sprout，提升阶段
        match: { knowledge_tags: knowledgeTags, plant_type: ['seed', 'sprout'] },
        upgrade: {
          growth_stage_increment: 25,     // +25%
          // seed(0) → sprout(25) → growing(50) → growing(75) → blooming(100)
        }
      }

    case 'bloom':
      return {
        type: 'upgrade',
        match: { knowledge_tags: knowledgeTags },
        upgrade: {
          growth_stage: 100,               // 直接开花
          plant_type: 'blooming',
        }
      }
  }
}

/**
 * growth_stage → plant_type 映射
 */
export function stageToType(stage: number): PlantType {
  if (stage <= 0) return 'seed'
  if (stage <= 25) return 'sprout'
  if (stage < 100) return 'growing'
  return 'blooming'
}
```

---

## 8. Step 7: 花园界面

### 8.1 花园页面重构 — `app/child/garden/page.tsx`

**从现有"学习进度可视化"改为"2D 花园世界"：**

```
┌─────────────────────────────────────────────┐
│  🌳 我的花园          [学科筛选] [花园设置]  │
│─────────────────────────────────────────────│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │    🌱        🌸    🌿              │   │  ← 花园画布
│  │         🌻              🌱          │   │     (可拖拽查看)
│  │    🌼         🌹                    │   │
│  │                   🌱    🌿          │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📊 花园统计                                │
│  ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ 种子 3  │ │ 成长 5  │ │ 开花 2 │        │
│  └────────┘ └────────┘ └────────┘        │
│                                             │
│  🌿 最近成长                                │
│  [数学种子发芽了！"20以内加法"] — 2小时前   │
│  [语文花开了！"声母 b p m f"] — 昨天        │
└─────────────────────────────────────────────┘
```

### 8.2 花园画布组件 — `components/child/garden-canvas.tsx`

```ts
interface GardenCanvasProps {
  plants: GardenPlant[]
  onPlantClick: (plant: GardenPlant) => void
  width?: number
  height?: number
}
```

**实现方式选择：**

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| CSS + div | 简单、无依赖 | 植物多时性能差 | ← **Phase 2 用这个** |
| Canvas 2D | 性能好 | 交互和动画复杂 | Phase 4 考虑 |
| SVG | 矢量清晰 | 复杂场景性能差 | 不选 |

> 理由：Phase 2 花园植物数量不多（预计 10-30 棵），CSS 方案最简单。

**花园背景：**
- 用 CSS 渐变实现草地 (`linear-gradient`)
- 底部深绿到顶部浅绿
- 偶尔几朵白云 CSS 动画

### 8.3 植物组件 — `components/child/garden-plant.tsx`

```ts
interface GardenPlantProps {
  plant: GardenPlant
  onClick: () => void
  isNew?: boolean               // 是否刚种下/刚成长（播放动画）
}
```

**植物视觉映射（使用 emoji + CSS 动画）：**

| plant_type | emoji | 大小 | 动画 |
|-----------|-------|------|------|
| seed | 🌰 | 24px | 无 |
| sprout | 🌱 | 32px | 冒出动画 (translate-y + scale) |
| growing | 🌿 | 40px | 轻微摇曳 |
| blooming | 🌸/🌻/🌼 (按学科) | 48px | 花瓣展开 + 微光 |
| withered | 🥀 | 32px | 无 |

**学科花朵颜色：**
- 语文：🌸 粉色
- 数学：🌻 黄色
- 英语：🌼 白色

### 8.4 植物详情弹窗 — `components/child/plant-detail.tsx`

点击植物弹出详情：

```
┌──────────────────────────┐
│       🌻 小向日葵        │
│      (数学 · 加法)       │
│                          │
│  📝 关联知识点            │
│  · 20以内加法             │
│  · 进位                   │
│                          │
│  📈 成长历程              │
│  🌰 种下 — 5月20日       │
│  🌱 发芽 — 5月21日       │
│  🌻 开花 — 5月24日       │
│                          │
│  💬 来源对话: "小兔子买苹果"│
│  [查看对话]              │
│                          │
│        [关闭]            │
└──────────────────────────┘
```

---

## 9. Step 8: 花园与对话联动

### 9.1 对话 → 花园（已有基础）

Phase 1 的 `/api/ai/chat` 在 `onFinish` 中解析 `garden_event`。
Phase 2 补充实际执行逻辑：

```ts
// 在 /api/ai/chat 的 onFinish 回调中
if (gardenEvent) {
  const action = processGardenEvent(gardenEvent, conversationId, knowledgeTags, subject)

  if (action.type === 'create') {
    await supabase.from('garden_plants').insert({
      child_id: childId,
      ...action.plant,
    })
  } else if (action.type === 'upgrade') {
    // 找到匹配的植物并升级
    const { data: plants } = await supabase
      .from('garden_plants')
      .select('*')
      .eq('child_id', childId)
      .overlaps('knowledge_tags', action.match.knowledge_tags)
      .in('plant_type', action.match.plant_type || ['seed', 'sprout', 'growing'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (plants?.[0]) {
      const newStage = Math.min(100, plants[0].growth_stage + (action.upgrade.growth_stage_increment || 0))
      await supabase.from('garden_plants').update({
        growth_stage: action.upgrade.growth_stage ?? newStage,
        plant_type: stageToType(action.upgrade.growth_stage ?? newStage),
        last_watered_at: new Date().toISOString(),
      }).eq('id', plants[0].id)
    }
  }
}
```

### 9.2 花园 → 对话

点击植物的 [查看对话] → 跳转 `/child/chat?conversationId={source_conversation_id}`

### 9.3 对话后花园成长提示

AI 对话结束后，如果触发了花园事件，在对话界面底部显示：

```
┌──────────────────────────────────────┐
│  🌱 你的花园有新变化！                │
│  "20以内加法" 的种子发芽了            │
│           [去看看花园]               │
└──────────────────────────────────────┘
```

组件：`components/child/garden-notification.tsx`

---

## 10. Step 9: 测试

### 10.1 单元测试

| 文件 | 测试点 |
|------|--------|
| `lib/garden/growth.ts` | 各 garden_event 类型的处理、stage→type 映射、edge cases |
| `lib/audio-player.ts` | 播放控制（mock Audio 对象） |

### 10.2 集成测试

| 测试点 | 方法 |
|--------|------|
| `/api/voice/stt` | Mock Whisper API → 验证返回文字 |
| `/api/voice/tts` | Mock TTS API → 验证返回音频流 |
| `/api/garden` | 植物 CRUD → 验证 RLS |
| 花园联动 | 发送带 garden_event 的对话 → 验证植物创建/升级 |

### 10.3 手动测试

- [ ] iPad Safari 录音权限弹窗正常
- [ ] 按住录音 → 波形动画流畅
- [ ] 松开 → 语音识别 → AI 回复 → 语音播放完整链路
- [ ] 滑出取消录音
- [ ] 安静环境下识别准确率 >80%
- [ ] 花园植物点击有详情弹窗
- [ ] 对话中种下种子 → 花园出现新植物
- [ ] 植物成长动画流畅

---

## 11. 数据流图

### 11.1 语音对话完整链路

```
┌───────────────────────────────────────────────────────┐
│                    客户端                              │
│                                                       │
│  [按住 🎤] → MediaRecorder 录音 → [松开]              │
│    ↓                                                  │
│  audioBlob                                            │
│    ↓                                                  │
│  fetch('/api/voice/stt', { body: FormData })          │
│    ↓ "为什么天是蓝的"                                  │
│  显示识别文字 → handleSubmit()                         │
│    ↓                                                  │
│  fetch('/api/ai/chat', { body: { message, ... } })    │
│    ↓ SSE 流式                                         │
│  文字逐字显示在气泡中                                   │
│    ↓ 流结束                                            │
│  fetch('/api/voice/tts', { body: { text } })          │
│    ↓ 音频                                              │
│  Audio.play() → 精灵语音播放                            │
│    ↓                                                   │
│  如有 garden_event → 显示花园通知                       │
└───────────────────────────────────────────────────────┘
```

### 11.2 花园联动

```
AI 对话 onFinish
    ├→ 解析 garden_event
    │   ├→ "seed_planted" → INSERT garden_plants (seed)
    │   ├→ "sprout" → UPDATE garden_plants (+25% growth)
    │   └→ "bloom" → UPDATE garden_plants (100%, blooming)
    │
    └→ 前端通知
        ├→ 对话页显示花园通知条
        └→ 花园页实时刷新（轮询或 Supabase Realtime）
```

---

## 12. 验收标准

### 功能验收

- [x] **V1**: 按住麦克风按钮录音，松开后自动发送 ✅
- [x] **V2**: 语音识别结果正确显示为文字 ✅
- [x] **V3**: AI 回复自动播放语音 ✅（支持 browser/siliconflow/openai 三种 Provider）
- [x] **V4**: 完整语音链路 < 6 秒（录音结束到精灵开始说话） ✅
- [x] **V5**: 录音权限被拒 → 友好提示 ✅
- [x] **V6**: 打字/语音模式切换 ✅

- [x] **G1**: 花园页面展示所有植物（画布 + 统计 + 列表） ✅
- [x] **G2**: 植物按成长阶段显示不同 emoji 和大小 ✅
- [x] **G3**: 点击植物显示详情（进度条、成长历程、知识点标签） ✅
- [x] **G4**: 对话中 garden_event 正确触发植物成长 ✅
- [x] **G5**: 花园统计面板和学科筛选 ✅

### 技术验收

- [x] **T1**: STT API 调用成功（SiliconFlow SenseVoice / OpenAI Whisper） ✅
- [x] **T2**: TTS API 返回可播放的音频流（SiliconFlow CosyVoice2 / OpenAI TTS） ✅
- [x] **T3**: 花园 API CRUD + RLS 正常 ✅
- [x] **T4**: 植物成长逻辑有单元测试（41 用例全通过） ✅
- [ ] **T5**: iPad Safari 录音兼容 — 待手动测试

### 体验验收

- [x] **U1**: 录音按钮触摸区域 ≥ 64px ✅
- [x] **U2**: 录音中有波形动画反馈 ✅
- [x] **U3**: 每个等待环节有精灵动画 ✅
- [x] **U4**: 花园植物成长有动画 ✅
- [x] **U5**: 植物详情弹窗简洁明了 ✅

---

## 附录：Phase 1 → Phase 2 接口复用

| Phase 1 组件 | Phase 2 如何使用 |
|-------------|-----------------|
| `useChat()` hook | 语音识别文字后，复用同一个 handleSubmit 发送 |
| `parseAIResponse()` | 继续解析 garden_event，触发花园操作 |
| `FairyAvatar` | 新增语音播放时的 "说话" 动画 |
| `ChatInput` | 新增 VoiceButton 到输入区域 |
| `garden_plants` 表 | Phase 1 已建表，Phase 2 直接使用 |
| `BottomNav` | 花园 tab 增加新植物角标 |
