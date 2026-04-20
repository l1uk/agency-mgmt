import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY')!

const authClient = createClient(supabaseUrl, anonKey)

export async function requireAgencyUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  console.log('Auth check - header present:', !!authHeader)
  console.log('Auth check - token present:', !!token)
  console.log('Auth check - anonKey present:', !!anonKey)

  if (!token) {
    console.log('Auth failed: Missing bearer token')
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: 'Missing bearer token' },
        { status: 401, headers: corsHeaders },
      ),
    }
  }

  const { data, error } = await authClient.auth.getUser(token)
  console.log('Auth getUser - error:', error?.message, 'user:', !!data?.user)
  
  if (error || !data.user) {
    console.log('Auth failed: Invalid token or user not found')
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders },
      ),
    }
  }

  if (data.user.user_metadata?.role !== 'agency') {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: 'Forbidden' },
        { status: 403, headers: corsHeaders },
      ),
    }
  }

  return { ok: true, user: data.user }
}
