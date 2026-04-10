import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY')!

const authClient = createClient(supabaseUrl, anonKey)

export async function requireAgencyUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: 'Missing bearer token' },
        { status: 401, headers: corsHeaders },
      ),
    }
  }

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
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
