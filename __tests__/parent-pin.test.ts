import { hashParentPin, validatePinFormat, verifyParentPin } from '@/lib/parent/pin'

describe('parent pin', () => {
  it('validates 4-6 digit numeric PIN', () => {
    expect(validatePinFormat('123')).toMatch(/4/)
    expect(validatePinFormat('1234567')).toMatch(/4/)
    expect(validatePinFormat('12ab')).toMatch(/4/)
    expect(validatePinFormat('1234')).toBeNull()
    expect(validatePinFormat('123456')).toBeNull()
  })

  it('hashes and verifies PIN', async () => {
    const hash = await hashParentPin('5678')
    expect(hash.startsWith('scrypt:')).toBe(true)
    expect(await verifyParentPin('5678', hash)).toBe(true)
    expect(await verifyParentPin('0000', hash)).toBe(false)
  })

  it('rejects malformed stored hash', async () => {
    expect(await verifyParentPin('1234', 'bad')).toBe(false)
    expect(await verifyParentPin('1234', null)).toBe(false)
  })
})
