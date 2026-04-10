import { createClient } from '@supabase/supabase-js'

// Vite only exposes variables prefixed with VITE_ to the browser.
// If these are undefined, check that your .env.local file uses exactly:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=sb_publishable_...
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[supabase] Missing env vars.\n' +
    'Create a .env.local file with:\n' +
    '  VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=sb_publishable_...'
  )
}

export const supabase = createClient(url, key)
export const supabaseUrl = url
export const supabaseAnonKey = key

export async function getFreshAccessToken() {
  let { data: sessionData, error } = await supabase.auth.getSession()
  if (error) throw error

  const session = sessionData.session
  const expiresAtMs = (session?.expires_at ?? 0) * 1000
  const isExpiredOrCloseToExpiry = !session?.access_token || expiresAtMs <= Date.now() + 60_000

  if (isExpiredOrCloseToExpiry) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw refreshError
    return refreshed.session?.access_token ?? null
  }

  return session.access_token
}

export async function invokeEdgeFunction(name, { accessToken, body } = {}) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const message = data?.error ?? `Edge function error: ${res.status}`
    return { data, error: new Error(message) }
  }

  return { data, error: null }
}
