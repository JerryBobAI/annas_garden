/**
 * 报告生成器测试
 */

import {
  buildReportContent,
  buildReportPrompt,
  type ConversationSummary,
  type MasteryChange,
  type CreationSummary,
} from '@/lib/engine/report-generator'

const mockConversations: ConversationSummary[] = [
  {
    id: '1',
    mode: 'explore',
    subject: 'math',
    message_count: 10,
    duration_minutes: 15,
    knowledge_tags: ['加法', '减法'],
    started_at: '2026-01-01',
  },
  {
    id: '2',
    mode: 'quest',
    subject: 'chinese',
    message_count: 8,
    duration_minutes: 12,
    knowledge_tags: ['识字', '朗读'],
    started_at: '2026-01-02',
  },
  {
    id: '3',
    mode: 'explore',
    subject: 'math',
    message_count: 6,
    duration_minutes: 10,
    knowledge_tags: ['加法'],
    started_at: '2026-01-03',
  },
]

const mockMasteryChanges: MasteryChange[] = [
  { knowledge_point: '加法', subject: 'math', mastery_before: 30, mastery_after: 50 },
  { knowledge_point: '减法', subject: 'math', mastery_before: 20, mastery_after: 25 },
  { knowledge_point: '识字', subject: 'chinese', mastery_before: 40, mastery_after: 60 },
]

const mockCreations: CreationSummary[] = [
  { id: '1', creation_type: 'story', title: '小猫的冒险', subject: 'chinese' },
]

const mockGarden = { new_plants: 3, blooming: 1, total_plants: 8 }
const mockSeeds = [{ question: '为什么天空是蓝色的？' }]

describe('buildReportContent', () => {
  it('应正确聚合概览数据', () => {
    const content = buildReportContent(
      mockConversations,
      mockMasteryChanges,
      mockCreations,
      mockGarden,
      mockSeeds
    )

    expect(content.overview.total_conversations).toBe(3)
    expect(content.overview.total_duration_minutes).toBe(37)
    expect(content.overview.mode_distribution['explore']).toBe(2)
    expect(content.overview.mode_distribution['quest']).toBe(1)
    expect(content.overview.subject_distribution['math']).toBe(2)
  })

  it('应正确提取兴趣话题', () => {
    const content = buildReportContent(
      mockConversations, mockMasteryChanges, mockCreations, mockGarden, mockSeeds
    )

    expect(content.interests.top_topics.length).toBeGreaterThan(0)
    // '加法' 出现 3 次，应排最前
    expect(content.interests.top_topics[0].topic).toBe('加法')
    expect(content.interests.curiosity_seeds_count).toBe(1)
  })

  it('应正确计算知识掌握', () => {
    const content = buildReportContent(
      mockConversations, mockMasteryChanges, mockCreations, mockGarden, mockSeeds
    )

    expect(content.mastery.by_subject.length).toBe(2) // math + chinese
    const mathMastery = content.mastery.by_subject.find(s => s.subject === 'math')
    expect(mathMastery).toBeDefined()
    // '加法' 提升 20 点 → improved
    expect(mathMastery!.improved).toContain('加法')
  })

  it('应正确统计创作', () => {
    const content = buildReportContent(
      mockConversations, mockMasteryChanges, mockCreations, mockGarden, mockSeeds
    )

    expect(content.creations.total).toBe(1)
    expect(content.creations.by_type['story']).toBe(1)
  })

  it('应正确传递花园数据', () => {
    const content = buildReportContent(
      mockConversations, mockMasteryChanges, mockCreations, mockGarden, mockSeeds
    )

    expect(content.garden).toEqual(mockGarden)
  })
})

describe('buildReportPrompt', () => {
  it('应包含孩子名字和数据', () => {
    const content = buildReportContent(
      mockConversations, mockMasteryChanges, mockCreations, mockGarden, mockSeeds
    )
    const prompt = buildReportPrompt(content, 'Anna')

    expect(prompt).toContain('Anna')
    expect(prompt).toContain('3 次')  // 3 次对话
    expect(prompt).toContain('37 分钟') // 总时长
  })
})
