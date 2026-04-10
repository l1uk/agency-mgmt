import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAgencyUser } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const emailFrom = Deno.env.get('EMAIL_FROM')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = await requireAgencyUser(req)
    if (!auth.ok) return auth.response

    const { contractId } = await req.json()
    if (!contractId) {
      return Response.json({ ok: false, error: 'Missing contractId' }, { status: 400, headers: corsHeaders })
    }

    const [{ data: contract, error: contractError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from('contracts')
        .select('id, client_name, start_date, end_date, renewed_at, models(first_name, last_name)')
        .eq('id', contractId)
        .single(),
      supabase.from('app_settings').select('agency_notification_email').eq('id', true).single(),
    ])

    if (contractError) throw contractError
    if (settingsError) throw settingsError
    if (!settings?.agency_notification_email) {
      return Response.json({ ok: false, error: 'Agency notification email not configured' }, { status: 400, headers: corsHeaders })
    }

    const { data: existing, error: existingError } = await supabase
      .from('contract_notification_log')
      .select('id')
      .eq('contract_id', contract.id)
      .eq('notification_type', 'renewal_confirmation')
      .eq('contract_end_date', contract.end_date)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) {
      return Response.json({ ok: true, sent: false, deduped: true }, { headers: corsHeaders })
    }

    const subject = 'Conferma rinnovo contratto'
    const html = `
      <h2>Rinnovo confermato</h2>
      <p><strong>Modello:</strong> ${contract.models?.first_name ?? ''} ${contract.models?.last_name ?? ''}</p>
      <p><strong>Cliente:</strong> ${contract.client_name}</p>
      <p><strong>Nuova scadenza:</strong> ${contract.end_date}</p>
      <p><strong>Rinnovato il:</strong> ${contract.renewed_at ?? '—'}</p>
    `

    const provider = await sendEmail({
      apiKey: resendApiKey,
      from: emailFrom,
      to: settings.agency_notification_email,
      subject,
      html,
    })

    const { error: insertError } = await supabase.from('contract_notification_log').insert({
      contract_id: contract.id,
      notification_type: 'renewal_confirmation',
      contract_end_date: contract.end_date,
      sent_to: settings.agency_notification_email,
      provider_message_id: provider?.id ?? null,
      metadata: { renewed_at: contract.renewed_at },
    })

    if (insertError) throw insertError

    return Response.json({ ok: true, sent: true }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500, headers: corsHeaders })
  }
})
