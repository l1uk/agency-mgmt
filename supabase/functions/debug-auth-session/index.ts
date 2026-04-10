import { corsHeaders, handleCors } from '../_shared/cors.ts'

function decodeJwtPayload(token: string) {
  const parts = token.split('.')
  if (parts.length < 2) throw new Error('Invalid JWT format')

  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')

  const json = atob(payload)
  return JSON.parse(json)
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return Response.json(
        { ok: false, error: 'Missing bearer token' },
        { status: 400, headers: corsHeaders },
      )
    }

    const claims = decodeJwtPayload(token)

    return Response.json(
      {
        ok: true,
        authenticated: true,
        claims: {
          sub: claims.sub ?? null,
          email: claims.email ?? null,
          role: claims.role ?? null,
          aud: claims.aud ?? null,
          exp: claims.exp ?? null,
          user_metadata: claims.user_metadata ?? null,
          app_metadata: claims.app_metadata ?? null,
        },
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500, headers: corsHeaders },
    )
  }
})
