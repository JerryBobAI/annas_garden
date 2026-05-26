/**
 * 知识图谱引擎
 *
 * 职责：
 * 1. 加载知识图谱（边列表 → 邻接表）
 * 2. 结合 knowledge_mastery 计算每个节点的"就绪"状态
 * 3. 推荐下一步学习的知识点
 */

import type { KnowledgeGraphEdge, KnowledgeNode, Subject } from '@/types'

// 前置知识掌握度阈值（达到此值视为已掌握）
const MASTERY_THRESHOLD = 60
// 推荐目标掌握度（低于此值才推荐）
const RECOMMENDATION_THRESHOLD = 80

/**
 * 构建知识图谱视图
 *
 * 将数据库中的边列表 + 孩子的掌握度数据 → 聚合成节点列表
 * 每个节点包含：前置关系、后续关系、是否就绪、是否推荐
 *
 * @param edges - 知识图谱边列表（来自 knowledge_graph 表）
 * @param mastery - 孩子的掌握度数据（knowledge_point → mastery_level 0-100）
 * @param subject - 筛选的学科
 * @returns 知识节点列表
 */
export function buildKnowledgeView(
  edges: KnowledgeGraphEdge[],
  mastery: Map<string, number>,
  subject: Subject
): KnowledgeNode[] {
  // 1. 收集所有节点（从 edges 中提取不重复的知识点）
  const nodes = new Map<string, KnowledgeNode>()

  // 辅助函数：确保节点存在
  function ensureNode(point: string): KnowledgeNode {
    if (!nodes.has(point)) {
      nodes.set(point, {
        point,
        subject,
        mastery_level: mastery.get(point) ?? 0,
        prerequisites: [],
        dependents: [],
        is_ready: false,
        recommended: false,
      })
    }
    return nodes.get(point)!
  }

  // 2. 建立邻接关系
  for (const edge of edges.filter(e => e.subject === subject)) {
    const fromNode = ensureNode(edge.from_point)
    const toNode = ensureNode(edge.to_point)

    // prerequisite: from 是 to 的前置
    if (edge.relation_type === 'prerequisite') {
      if (!toNode.prerequisites.includes(edge.from_point)) {
        toNode.prerequisites.push(edge.from_point)
      }
      if (!fromNode.dependents.includes(edge.to_point)) {
        fromNode.dependents.push(edge.to_point)
      }
    }
    // related / includes: 双向记为弱关联（不影响就绪判断）
  }

  // 3. 计算 is_ready: 所有 prerequisite 的 mastery >= MASTERY_THRESHOLD
  for (const node of nodes.values()) {
    if (node.prerequisites.length === 0) {
      // 无前置条件 → 始终就绪
      node.is_ready = true
    } else {
      node.is_ready = node.prerequisites.every(prereq => {
        const prereqMastery = mastery.get(prereq) ?? 0
        return prereqMastery >= MASTERY_THRESHOLD
      })
    }
  }

  // 4. 计算 recommended: is_ready && mastery < RECOMMENDATION_THRESHOLD
  for (const node of nodes.values()) {
    node.recommended = node.is_ready && node.mastery_level < RECOMMENDATION_THRESHOLD
  }

  return Array.from(nodes.values())
}

/**
 * 获取推荐学习的知识点列表
 *
 * 策略：
 * 1. 找所有 "就绪但未掌握" 的知识点 (recommended === true)
 * 2. 优先选择与最近学习内容相关的（加权排序）
 * 3. 优先选择掌握度最低的
 * 4. 最多返回 limit 个推荐
 *
 * @param nodes - 知识节点列表（由 buildKnowledgeView 生成）
 * @param recentTopics - 最近学习过的知识点列表
 * @param limit - 最多返回几个推荐（默认 3）
 * @returns 推荐的知识节点列表
 */
export function getRecommendations(
  nodes: KnowledgeNode[],
  recentTopics: string[] = [],
  limit: number = 3
): KnowledgeNode[] {
  return nodes
    .filter(n => n.recommended)
    .sort((a, b) => {
      // 优先: 最近相关 > 掌握度低 > 依赖少（后续影响大的优先）
      const aRecent = recentTopics.includes(a.point) ? -10 : 0
      const bRecent = recentTopics.includes(b.point) ? -10 : 0
      const aScore = a.mastery_level + aRecent - a.dependents.length * 2
      const bScore = b.mastery_level + bRecent - b.dependents.length * 2
      return aScore - bScore
    })
    .slice(0, limit)
}

/**
 * 获取知识点的所有前置知识点（递归）
 *
 * 用于判断某个知识点的完整依赖链
 *
 * @param nodes - 知识节点列表
 * @param point - 目标知识点
 * @returns 所有前置知识点名称（不含自身）
 */
export function getAllPrerequisites(
  nodes: KnowledgeNode[],
  point: string
): string[] {
  const result = new Set<string>()
  const visited = new Set<string>()

  function dfs(current: string) {
    if (visited.has(current)) return
    visited.add(current)

    const node = nodes.find(n => n.point === current)
    if (!node) return

    for (const prereq of node.prerequisites) {
      result.add(prereq)
      dfs(prereq)
    }
  }

  dfs(point)
  return Array.from(result)
}
