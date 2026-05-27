/**
 * API 入参校验工具
 *
 * 基于 zod 的通用 schema 定义和校验函数
 * 所有 API 路由共享这些 schema
 */

import { z } from 'zod'

// ==================== 通用 Schema ====================

/** UUID 格式校验 */
export const uuidSchema = z.string().uuid('无效的 ID 格式')

/** 学科枚举 */
export const subjectSchema = z.enum(['chinese', 'math', 'english'])

/** 对话模式枚举 */
export const chatModeSchema = z.enum(['explore', 'quest', 'create'])

/** 报告类型枚举 */
export const reportTypeSchema = z.enum(['weekly', 'monthly'])

/** 分页参数 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// ==================== API Schema ====================

/** POST /api/ai/chat — 聊天消息 */
export const chatMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, '消息不能为空'),
  })).min(1, '至少需要一条消息'),
  mode: chatModeSchema.optional(),
  subject: subjectSchema.optional(),
  conversationId: z.string().optional(),
})

/** POST /api/reports/generate — 生成报告 */
export const generateReportSchema = z.object({
  child_id: z.string().optional(),
  type: reportTypeSchema.optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
})

/** POST /api/imports — 导入内容 */
export const importContentSchema = z.object({
  text: z.string().min(10, '内容至少 10 个字符').max(50000, '内容不能超过 50000 字符'),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字符').optional(),
  subject: subjectSchema.optional(),
  goal_id: z.string().optional(),
})

/** POST /api/creations — 创建作品 */
export const createCreationSchema = z.object({
  creation_type: z.enum(['story', 'math', 'english']),
  title: z.string().min(1).max(200),
  subject: subjectSchema.optional(),
  cover_emoji: z.string().optional(),
})

/** POST /api/garden/event — 花园事件 */
export const gardenEventSchema = z.object({
  child_id: z.string(),
  subject: subjectSchema.optional(),
  action: z.enum(['plant', 'water', 'grow', 'bloom']),
  knowledge_tag: z.string().optional(),
})

// ==================== 校验工具函数 ====================

/**
 * 校验 JSON body 并返回类型安全的数据
 *
 * @example
 * const result = await validateBody(req, generateReportSchema)
 * if (!result.success) return Response.json({ error: result.error }, { status: 400 })
 * const { type, child_id } = result.data
 */
export async function validateBody<T extends z.ZodSchema>(
  req: Request,
  schema: T,
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { success: false, error: '请求体格式错误，需要 JSON' }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    return {
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : '参数校验失败',
    }
  }

  return { success: true, data: result.data }
}

/**
 * 校验 URL 查询参数
 *
 * @example
 * const params = validateQuery(req, paginationSchema)
 */
export function validateQuery<T extends z.ZodSchema>(
  req: Request,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())

  const result = schema.safeParse(params)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    return {
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : '查询参数校验失败',
    }
  }

  return { success: true, data: result.data }
}
