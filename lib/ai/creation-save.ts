import type { Subject } from '@/types'

type CreationContent = Record<string, unknown>

export function isEmptyCreationContent(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return true
  return Object.keys(content).length === 0
}

export function mergeCreationContent(
  subject: Subject | undefined,
  previousContent: unknown,
  pageContent: string,
  pageNumber: number,
  knowledgeTags: string[] = [],
): CreationContent {
  const base = (
    previousContent && typeof previousContent === 'object' && !Array.isArray(previousContent)
      ? previousContent
      : {}
  ) as CreationContent

  if (subject === 'math') {
    return {
      topic: base.topic || knowledgeTags[0] || '数学探索',
      problem_count: Number(base.problem_count || 0) + 1,
      correct_count: Number(base.correct_count || 0),
      visualization_type: base.visualization_type || 'story',
      steps: [
        ...((Array.isArray(base.steps) ? base.steps : []) as unknown[]),
        {
          step: pageNumber,
          problem: pageContent,
          answer: null,
          correct: false,
        },
      ],
    }
  }

  if (subject === 'english') {
    return {
      scenario: base.scenario || '英语冒险',
      character: base.character || 'Anna',
      dialogue_turns: Number(base.dialogue_turns || 0) + 1,
      new_words: Array.from(new Set([
        ...((Array.isArray(base.new_words) ? base.new_words : []) as string[]),
        ...knowledgeTags,
      ])),
      pronunciation_attempts: Number(base.pronunciation_attempts || 0),
    }
  }

  return {
    genre: base.genre || '故事',
    characters: Array.isArray(base.characters) ? base.characters : ['Anna', '花园精灵'],
    setting: base.setting || 'Anna 的花园',
    page_count: Math.max(Number(base.page_count || 0), pageNumber),
    total_words: Number(base.total_words || 0) + pageContent.length,
  }
}
