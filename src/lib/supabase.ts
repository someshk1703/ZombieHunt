import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let serverTimeOffset = 0

export async function syncServerTime(): Promise<void> {
  try {
    const clientBefore = Date.now()
    const { data } = await supabase.rpc('get_server_time')
    const clientAfter = Date.now()
    const roundTrip = clientAfter - clientBefore
    const serverTime = new Date(data as string).getTime()
    serverTimeOffset = serverTime - (clientAfter - roundTrip / 2)
  } catch (e) {
    console.warn('Server time sync failed, using local clock')
    serverTimeOffset = 0
  }
}

export function getAdjustedNow(): number {
  return Date.now() + serverTimeOffset
}

export async function signInAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.user
  } catch (err) {
    console.error('[auth] signInAnonymously failed:', err)
    return null
  }
}
