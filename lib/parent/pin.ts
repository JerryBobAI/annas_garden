import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const SCRYPT_KEYLEN = 64

export const PIN_MIN_LEN = 4
export const PIN_MAX_LEN = 6
export const PIN_PATTERN = /^\d{4,6}$/

export function validatePinFormat(pin: string): string | null {
  const trimmed = pin.trim()
  if (!PIN_PATTERN.test(trimmed)) {
    return `PIN 须为 ${PIN_MIN_LEN}–${PIN_MAX_LEN} 位数字`
  }
  return null
}

export async function hashParentPin(pin: string): Promise<string> {
  const trimmed = pin.trim()
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(trimmed, salt, SCRYPT_KEYLEN)) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyParentPin(
  pin: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, expectedHex] = parts
  const derived = (await scryptAsync(pin.trim(), salt, SCRYPT_KEYLEN)) as Buffer
  const expected = Buffer.from(expectedHex, 'hex')
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

/** 旧版全站 env PIN，仅作未设置家庭 PIN 时的过渡兜底 */
export function getLegacyEnvParentPin(): string | undefined {
  const pin = process.env.PARENT_ACCESS_PIN || process.env.PARENT_AREA_PIN
  const trimmed = pin?.trim()
  return trimmed || undefined
}
