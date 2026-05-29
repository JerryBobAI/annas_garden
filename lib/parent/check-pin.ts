import type { SupabaseClient } from '@supabase/supabase-js'
import { getLegacyEnvParentPin, verifyParentPin } from '@/lib/parent/pin'

export async function fetchUserPinHash(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('parent_pin_hash')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.parent_pin_hash ?? null
}

/** 校验 PIN：优先账户哈希，否则过渡期内允许 env 全站 PIN */
export async function isParentPinValid(
  supabase: SupabaseClient,
  userId: string,
  pin: string,
): Promise<boolean> {
  const hash = await fetchUserPinHash(supabase, userId)
  if (hash) {
    return verifyParentPin(pin, hash)
  }
  const legacy = getLegacyEnvParentPin()
  return legacy !== undefined && pin.trim() === legacy
}

export async function userHasPersonalPin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const hash = await fetchUserPinHash(supabase, userId)
  return !!hash
}
