import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAgencyUser } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

function isExistingUserInviteError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('already') || normalized.includes('exists') || normalized.includes('registered')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getValidRedirectUrlFromEnv(envKey: string) {
  const raw = Deno.env.get(envKey)
  if (!raw) return undefined

  try {
    const parsed = new URL(raw)
    return parsed.toString()
  } catch {
    console.warn(`Invalid redirect URL in ${envKey}: ${raw}`)
    return undefined
  }
}

function formatAuthAdminError(error: unknown) {
  const err = error as { message?: string; code?: string; status?: number }
  const message = err?.message ?? 'Unknown auth admin error'
  const code = err?.code ?? 'unknown_code'
  const status = err?.status ?? 400
  return { message, code, status }
}

async function findAuthUserByEmail(email: string) {
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) throw error

    const match = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match

    if (data.users.length < 200) return null
    page += 1
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = await requireAgencyUser(req)
    if (!auth.ok) return auth.response
    let inviteMode: 'new_invite' | 'relinked_existing_user' = 'new_invite'

    const { schoolId } = await req.json()
    if (!schoolId) {
      return Response.json({ ok: false, error: 'Missing schoolId' }, { status: 400, headers: corsHeaders })
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, email')
      .eq('id', schoolId)
      .single()

    if (schoolError) throw schoolError
    if (!school?.email) {
      return Response.json({ ok: false, error: 'School email not configured' }, { status: 400, headers: corsHeaders })
    }

    if (!isValidEmail(school.email)) {
      return Response.json({ ok: false, error: `Invalid school email: ${school.email}` }, { status: 400, headers: corsHeaders })
    }

    const redirectTo = getValidRedirectUrlFromEnv('SCHOOL_INVITE_REDIRECT_TO')

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(school.email, {
      data: {
        role: 'school',
        school_id: school.id,
      },
      redirectTo,
    })

    if (inviteError) {
      const details = formatAuthAdminError(inviteError)
      const isExisting =
        isExistingUserInviteError(details.message) ||
        details.code.toLowerCase().includes('exists') ||
        details.code.toLowerCase().includes('already')

      if (!isExisting) {
        return Response.json(
          { ok: false, error: `${details.message} (code: ${details.code}, status: ${details.status})` },
          { status: 400, headers: corsHeaders },
        )
      }

      const existingUser = await findAuthUserByEmail(school.email)
      if (!existingUser) {
        return Response.json(
          { ok: false, error: 'Utente auth esistente non trovato per questa email.' },
          { status: 400, headers: corsHeaders },
        )
      }

      const mergedUserMetadata = {
        ...(existingUser.user_metadata ?? {}),
        role: 'school',
        school_id: school.id,
      }

      const { error: relinkError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: mergedUserMetadata,
      })

      if (relinkError) {
        return Response.json({ ok: false, error: relinkError.message }, { status: 400, headers: corsHeaders })
      }

      inviteMode = 'relinked_existing_user'
    }

    const { error: updateError } = await supabase
      .from('schools')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', school.id)

    if (updateError) throw updateError

    return Response.json({ ok: true, invited: true, email: school.email, mode: inviteMode }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500, headers: corsHeaders })
  }
})
