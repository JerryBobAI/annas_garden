'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

/**
 * Read the signed-in user on the client. Prefers local session (middleware
 * already refreshes cookies) and swallows network failures so dev overlays
 * don't surface unhandled "Failed to fetch" from auth-js.
 */
export async function getClientUser(): Promise<User | null> {
  const supabase = createClient()
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.warn('[auth] getSession:', sessionError.message)
    }
    if (session?.user) return session.user

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.warn('[auth] getUser:', userError.message)
      return null
    }
    return user
  } catch (err) {
    console.warn('[auth] unavailable:', err instanceof Error ? err.message : err)
    return null
  }
}
