import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAgencyUser } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const emailFrom = Deno.env.get('EMAIL_FROM')

const supabase = createClient(supabaseUrl, serviceRoleKey)

function isExistingUserInviteError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('already') || normalized.includes('exists') || normalized.includes('registered')
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

    const { agentId } = await req.json()
    if (!agentId) {
      return Response.json({ ok: false, error: 'Missing agentId' }, { status: 400, headers: corsHeaders })
    }

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, email')
      .eq('id', agentId)
      .single()

    if (agentError) throw agentError
    if (!agent?.email) {
      return Response.json({ ok: false, error: 'Agent email not configured' }, { status: 400, headers: corsHeaders })
    }

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(agent.email, {
      data: {
        role: 'agent',
        agent_id: agent.id,
      },
      redirectTo: Deno.env.get('AGENT_INVITE_REDIRECT_TO') ?? undefined,
    })

    if (inviteError) {
      if (!isExistingUserInviteError(inviteError.message)) {
        return Response.json({ ok: false, error: inviteError.message }, { status: 400, headers: corsHeaders })
      }

      const existingUser = await findAuthUserByEmail(agent.email)
      if (!existingUser) {
        return Response.json(
          { ok: false, error: 'Utente auth esistente non trovato per questa email.' },
          { status: 400, headers: corsHeaders },
        )
      }

      const mergedUserMetadata = {
        ...(existingUser.user_metadata ?? {}),
        role: 'agent',
        agent_id: agent.id,
      }

      const { error: relinkError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: mergedUserMetadata,
      })

      if (relinkError) {
        return Response.json({ ok: false, error: relinkError.message }, { status: 400, headers: corsHeaders })
      }

      if (resendApiKey && emailFrom) {
        const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: agent.email,
          redirectTo: Deno.env.get('AGENT_INVITE_REDIRECT_TO') ?? undefined,
        })

        if (recoveryError) {
          return Response.json({ ok: false, error: recoveryError.message }, { status: 400, headers: corsHeaders })
        }

        const actionLink = recoveryData?.properties?.action_link
        if (!actionLink) {
          return Response.json({ ok: false, error: 'Recovery link non generato.' }, { status: 500, headers: corsHeaders })
        }

        await sendEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: agent.email,
          subject: 'Accesso portale agente',
          html: `
            <h2>Accesso portale agente</h2>
            <p>Ciao ${agent.name},</p>
            <p>il tuo account agente e stato collegato al nuovo profilo nel gestionale Hunt Models.</p>
            <p><a href="${actionLink}">Accedi / imposta password</a></p>
          `,
        })
      }

      inviteMode = 'relinked_existing_user'
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', agent.id)

    if (updateError) throw updateError

    return Response.json({ ok: true, invited: true, email: agent.email, mode: inviteMode }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500, headers: corsHeaders })
  }
})
