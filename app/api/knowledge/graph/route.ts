/**
 * 知识图谱 API
 *
 * GET /api/knowledge/graph?subject=math&child_id=xxx
 * → 返回该学科的知识图谱 + 孩子的掌握度
 */

import { createClient } from '@/lib/supabase/server'
import { buildKnowledgeView } from '@/lib/engine/knowledge-graph'
import type { Subject, KnowledgeGraphEdge } from '@/types'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject') as Subject | null
  const childId = searchParams.get('child_id') || user.id

  if (!subject || !['chinese', 'math', 'english'].includes(subject)) {
    return Response.json({ error: '请指定学科 (chinese/math/english)' }, { status: 400 })
  }

  try {
    // 1. 加载知识图谱边
    const { data: edges, error: edgeError } = await supabase
      .from('knowledge_graph')
      .select('*')
      .eq('subject', subject)

    if (edgeError) throw edgeError

    // 2. 加载孩子的掌握度数据
    const { data: masteryData, error: masteryError } = await supabase
      .from('knowledge_mastery')
      .select('knowledge_point, mastery_level')
      .eq('child_id', childId)
      .eq('subject', subject)

    if (masteryError) throw masteryError

    // 3. 构建掌握度 Map
    const mastery = new Map<string, number>()
    for (const m of (masteryData || [])) {
      mastery.set(m.knowledge_point, m.mastery_level)
    }

    // 4. 构建知识图谱视图
    const nodes = buildKnowledgeView(
      (edges || []) as KnowledgeGraphEdge[],
      mastery,
      subject
    )

    return Response.json({
      subject,
      nodes,
      edges: edges || [],
      total_nodes: nodes.length,
      ready_count: nodes.filter(n => n.is_ready).length,
      recommended_count: nodes.filter(n => n.recommended).length,
    })
  } catch (err) {
    console.error('Knowledge graph API error:', err)
    return Response.json({ error: '获取知识图谱失败' }, { status: 500 })
  }
}
