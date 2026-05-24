import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
