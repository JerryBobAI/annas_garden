// 用户角色
export type UserRole = 'parent' | 'child'

// 学科
export type Subject = 'chinese' | 'math' | 'english'

// 优先级
export type Priority = 'core' | 'important' | 'normal'

// 资源类型
export type MaterialType = 'textbook' | 'exercise' | 'video' | 'audio' | 'image'

// 内容来源
export type SourceType = 'manual' | 'ai_generated' | 'external'

// 内容状态
export type ContentStatus = 'draft' | 'approved' | 'rejected'

// 难度
export type Difficulty = 'easy' | 'medium' | 'hard'

// 活动类型
export type ActivityType = 'view' | 'practice' | 'review'

// 计划类型
export type ScheduleType = 'daily' | 'weekly' | 'ai_recommended' | 'external'

// 计划状态
export type PlanStatus = 'pending' | 'completed' | 'skipped'

// 用户档案
export interface Profile {
  id: string
  email: string
  role: UserRole
  parent_id?: string
  created_at: string
}

// 学习资料
export interface Material {
  id: string
  subject: Subject
  grade: string
  type: MaterialType
  title: string
  content: any // JSON 存储结构化内容
  source: SourceType
  source_url?: string
  status: ContentStatus
  created_by: string
  created_at: string
}

// 练习题
export interface Exercise {
  id: string
  material_id: string
  question: any // JSON 支持多种题型
  options?: any[] // 选择题选项
  correct_answer: string
  difficulty: Difficulty
  knowledge_points: string[] // 标签，如 ["加法", "进位"]
}

// 学习记录
export interface LearningRecord {
  id: string
  child_id: string
  material_id: string
  exercise_id?: string
  activity_type: ActivityType
  duration: number // 秒
  score?: number
  is_correct?: boolean
  created_at: string
}

// 错题记录
export interface WrongAnswer {
  id: string
  child_id: string
  exercise_id: string
  wrong_count: number
  last_wrong_at: string
  mastered: boolean
  mastered_at?: string
}

// 学期
export interface Semester {
  id: string
  name: string
  start_date: string
  end_date: string
  grade: string
}

// 学习目标
export interface LearningGoal {
  id: string
  semester_id: string
  subject: Subject
  week_number: number
  title: string
  description: string
  priority: Priority
  mastery_threshold: number // 掌握阈值，正确率目标
}

// 内容计划
export interface ContentSchedule {
  id: string
  goal_id: string
  schedule_type: ScheduleType
  plan_date: string
  status: PlanStatus
}

// 外部数据源
export interface DataSource {
  id: string
  name: string
  type: 'rss' | 'api' | 'scrape'
  url: string
  enabled: boolean
  last_sync_at?: string
}

// AI 推荐
export interface AIRecommendation {
  id: string
  goal_id: string
  recommend_reason: string
  confidence: number
  status: ContentStatus
}

// 学习计划
export interface StudyPlan {
  id: string
  child_id: string
  title: string
  daily_goal: any // JSON 每日目标配置
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'paused'
}

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
