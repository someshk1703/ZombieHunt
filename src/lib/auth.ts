import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signInAnonymously } from './supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setState({ user: session.user, session, loading: false })
      } else {
        // Auto sign-in anonymously — silent, no user action needed
        const user = await signInAnonymously()
        const { data: { session: newSession } } = await supabase.auth.getSession()
        setState({ user, session: newSession, loading: false })
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
      }))
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
