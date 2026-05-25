import { isEmptyCreationContent, mergeCreationContent } from '@/lib/ai/creation-save'

describe('creation-save helpers', () => {
  it('识别空创作内容对象', () => {
    expect(isEmptyCreationContent({})).toBe(true)
    expect(isEmptyCreationContent({ page_count: 1 })).toBe(false)
  })

  it('合并故事创作内容', () => {
    const content = mergeCreationContent('chinese', {}, '第一段故事', 1, ['想象力'])

    expect(content.page_count).toBe(1)
    expect(content.total_words).toBe(5)
    expect(content.characters).toEqual(['Anna', '花园精灵'])
  })

  it('合并英语创作的新词标签', () => {
    const content = mergeCreationContent(
      'english',
      { new_words: ['sun'], dialogue_turns: 1 },
      'Hello garden',
      2,
      ['seed'],
    )

    expect(content.dialogue_turns).toBe(2)
    expect(content.new_words).toEqual(['sun', 'seed'])
  })
})
