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
