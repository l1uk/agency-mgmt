import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function extractMeta(session) {
  const meta = session?.user?.user_metadata ?? {}
  return {
    role:      meta.role      ?? null,   // 'agency' | 'school' | 'agent'
    school_id: meta.school_id ?? null,
    agent_id:  meta.agent_id  ?? null,
  }
}

export function useAuth() {
  const [user, setUser]         = useState(null)
  const [role, setRole]         = useState(null)
  const [schoolId, setSchoolId] = useState(null)
  const [agentId, setAgentId]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const m = extractMeta(session)
      setUser(session?.user ?? null)
      setRole(m.role); setSchoolId(m.school_id); setAgentId(m.agent_id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const m = extractMeta(session)
      setUser(session?.user ?? null)
      setRole(m.role); setSchoolId(m.school_id); setAgentId(m.agent_id)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await supabase.auth.refreshSession()
    return { error, user: data?.user }
  }

  const signOut = async () => { await supabase.auth.signOut() }

  return { user, role, schoolId, agentId, loading, signIn, signOut }
}
