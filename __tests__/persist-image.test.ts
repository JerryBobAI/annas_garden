import {
  buildIllustrationPath,
  extensionFromContentType,
  parseDataUri,
} from '@/lib/storage/persist-image'

describe('persist-image helpers', () => {
  it('parseDataUri decodes base64 png', () => {
    const png = Buffer.from('hello').toString('base64')
    const parsed = parseDataUri(`data:image/png;base64,${png}`)
    expect(parsed).not.toBeNull()
    expect(parsed!.contentType).toBe('image/png')
    expect(parsed!.ext).toBe('png')
    expect(parsed!.buffer.toString()).toBe('hello')
  })

  it('parseDataUri returns null for invalid input', () => {
    expect(parseDataUri('https://example.com/a.png')).toBeNull()
  })

  it('buildIllustrationPath scopes by user and conversation', () => {
    const path = buildIllustrationPath('user-1', 'conv-abc', 'png')
    expect(path.startsWith('user-1/conv-abc/')).toBe(true)
    expect(path.endsWith('.png')).toBe(true)
  })

  it('buildIllustrationPath uses general folder without conversation', () => {
    const path = buildIllustrationPath('user-1', undefined, 'webp')
    expect(path.startsWith('user-1/general/')).toBe(true)
  })

  it('extensionFromContentType maps jpeg to jpg', () => {
    expect(extensionFromContentType('image/jpeg')).toBe('jpg')
    expect(extensionFromContentType('image/png')).toBe('png')
  })
})
