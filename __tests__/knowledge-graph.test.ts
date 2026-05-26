/**
 * 知识图谱引擎测试
 */

import {
  buildKnowledgeView,
  getRecommendations,
  getAllPrerequisites,
} from '@/lib/engine/knowledge-graph'
import type { KnowledgeGraphEdge } from '@/types'

// 模拟数学知识图谱
const mathEdges: KnowledgeGraphEdge[] = [
  { id: '1', subject: 'math', from_point: '10以内加法', to_point: '20以内加法', relation_type: 'prerequisite', weight: 1.0 },
  { id: '2', subject: 'math', from_point: '10以内减法', to_point: '20以内退位减法', relation_type: 'prerequisite', weight: 1.0 },
  { id: '3', subject: 'math', from_point: '20以内加法', to_point: '100以内加减法', relation_type: 'prerequisite', weight: 0.9 },
  { id: '4', subject: 'math', from_point: '20以内退位减法', to_point: '100以内加减法', relation_type: 'prerequisite', weight: 0.9 },
  { id: '5', subject: 'math', from_point: '20以内加法', to_point: '20以内退位减法', relation_type: 'related', weight: 0.7 },
]

describe('buildKnowledgeView', () => {
  it('应该构建正确的节点列表', () => {
    const mastery = new Map<string, number>()
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')

    // 应该有 5 个不同的知识点
    expect(nodes.length).toBe(5)

    // 10以内加法应该是根节点（无前置）
    const root = nodes.find(n => n.point === '10以内加法')
    expect(root).toBeDefined()
    expect(root!.prerequisites.length).toBe(0)
    expect(root!.is_ready).toBe(true) // 无前置 → 始终就绪
  })

  it('前置未掌握时 is_ready 应为 false', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 30], // 未达到 60 阈值
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')

    const node20 = nodes.find(n => n.point === '20以内加法')
    expect(node20!.is_ready).toBe(false) // 前置 10以内加法 = 30 < 60
  })

  it('前置已掌握时 is_ready 应为 true', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 80],
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')

    const node20 = nodes.find(n => n.point === '20以内加法')
    expect(node20!.is_ready).toBe(true) // 前置 10以内加法 = 80 >= 60
  })

  it('就绪但掌握度低的节点应标记为推荐', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 80], // 前置已掌握
      ['20以内加法', 20], // 本身掌握度低
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')

    const node20 = nodes.find(n => n.point === '20以内加法')
    expect(node20!.recommended).toBe(true)
  })

  it('掌握度已高的节点不应推荐', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 90],
      ['20以内加法', 85], // 已掌握 >= 80
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')

    const node20 = nodes.find(n => n.point === '20以内加法')
    expect(node20!.recommended).toBe(false)
  })

  it('只处理指定学科的边', () => {
    const mixedEdges: KnowledgeGraphEdge[] = [
      ...mathEdges,
      { id: '10', subject: 'chinese', from_point: '声母', to_point: '拼音拼读', relation_type: 'prerequisite', weight: 1.0 },
    ]
    const nodes = buildKnowledgeView(mixedEdges, new Map(), 'math')
    expect(nodes.every(n => n.subject === 'math')).toBe(true)
  })
})

describe('getRecommendations', () => {
  it('应该返回推荐的节点', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 80],
      ['10以内减法', 80],
      ['20以内加法', 30],
      ['20以内退位减法', 10],
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')
    const recs = getRecommendations(nodes)

    expect(recs.length).toBeGreaterThan(0)
    expect(recs.every(r => r.recommended)).toBe(true)
  })

  it('应该限制返回数量', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 80],
      ['10以内减法', 80],
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')
    const recs = getRecommendations(nodes, [], 1)

    expect(recs.length).toBeLessThanOrEqual(1)
  })

  it('最近学习的主题应优先推荐', () => {
    const mastery = new Map<string, number>([
      ['10以内加法', 80],
      ['10以内减法', 80],
      ['20以内加法', 20],
      ['20以内退位减法', 20],
    ])
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')
    const recs = getRecommendations(nodes, ['20以内加法'], 1)

    expect(recs[0].point).toBe('20以内加法')
  })
})

describe('getAllPrerequisites', () => {
  it('应该返回所有递归前置', () => {
    const mastery = new Map<string, number>()
    const nodes = buildKnowledgeView(mathEdges, mastery, 'math')
    const prereqs = getAllPrerequisites(nodes, '100以内加减法')

    expect(prereqs).toContain('20以内加法')
    expect(prereqs).toContain('20以内退位减法')
    expect(prereqs).toContain('10以内加法')
    expect(prereqs).toContain('10以内减法')
  })

  it('根节点应无前置', () => {
    const nodes = buildKnowledgeView(mathEdges, new Map(), 'math')
    const prereqs = getAllPrerequisites(nodes, '10以内加法')
    expect(prereqs.length).toBe(0)
  })
})
