/**
 * 智能推荐 API
 *
 * GET /api/recommendations?child_id=xxx
 * → 返回推荐的学习任务列表
 *
 * 推荐算法：
 * 1. 加载各学科知识图谱 + 掌握度
 * 2. buildKnowledgeView() → 就绪节点列表
 * 3. getRecommendations() → 推荐知识点
 * 4. 结合认知档案选择推荐模式 + 预估时长
 */

import { createClient } from '@/lib/supabase/server'
import { buildKnowledgeView, getRecommendations } from '@/lib/engine/knowledge-graph'
import type { Subject, KnowledgeGraphEdge, LearningRecommendation, LearningMode } from '@/types'

const SUBJECTS: Subject[] = ['chinese', 'math', 'english']

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('child_id') || user.id

  try {
    // 1. 加载所有学科的知识图谱
    const { data: allEdges, error: edgeError } = await supabase
      .from('knowledge_graph')
      .select('*')

    if (edgeError) throw edgeError

    // 2. 加载孩子的所有掌握度数据
    const { data: allMastery, error: masteryError } = await supabase
      .from('knowledge_mastery')
      .select('knowledge_point, mastery_level, subject')
      .eq('child_id', childId)

    if (masteryError) throw masteryError

    // 3. 加载认知档案
    const { data: profile } = await supabase
      .from('cognitive_profiles')
      .select('preferred_mode, attention_span_avg')
      .eq('child_id', childId)
      .single()

    // 4. 加载最近对话（获取 recent topics）
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('child_id', childId)
      .order('started_at', { ascending: false })
      .limit(5)

    const recentTopics = (recentConversations || [])
      .flatMap(c => {
        const meta = c.metadata as Record<string, unknown> | null
        return Array.isArray(meta?.knowledge_tags) ? meta.knowledge_tags as string[] : []
      })

    // 5. 逐学科计算推荐
    const recommendations: LearningRecommendation[] = []

    for (const subject of SUBJECTS) {
      // 构建该学科的掌握度 Map
      const mastery = new Map<string, number>()
      for (const m of (allMastery || [])) {
        if (m.subject === subject) {
          mastery.set(m.knowledge_point, m.mastery_level)
        }
      }

      // 构建知识图谱视图
      const nodes = buildKnowledgeView(
        (allEdges || []) as KnowledgeGraphEdge[],
        mastery,
        subject
      )

      // 获取推荐（每学科最多 1 个，总共 3 个）
      const subjectRecs = getRecommendations(nodes, recentTopics, 1)

      for (const node of subjectRecs) {
        // 根据认知档案选择推荐模式
        const suggestedMode: LearningMode = profile?.preferred_mode || 'quest'

        // 根据专注时长估算学习时间
        const avgAttention = profile?.attention_span_avg || 600 // 默认 10 分钟
        const estimatedMinutes = Math.max(5, Math.round(avgAttention / 60))

        recommendations.push({
          knowledge_point: node.point,
          subject,
          suggested_mode: suggestedMode,
          current_mastery: node.mastery_level,
          target_mastery: 80,
          estimated_minutes: estimatedMinutes,
          reason: node.prerequisites.length > 0
            ? `前置知识已掌握，建议下一步学习`
            : `基础知识点，推荐开始学习`,
        })
      }
    }

    return Response.json({
      recommendations,
      total: recommendations.length,
    })
  } catch (err) {
    console.error('Recommendations API error:', err)
    return Response.json({ error: '获取推荐失败' }, { status: 500 })
  }
}
