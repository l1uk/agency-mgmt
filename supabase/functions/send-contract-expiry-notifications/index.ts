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

    const { data: rows, error } = await supabase
      .from('contracts_due_for_expiry_notification')
      .select('*')
      .order('end_date', { ascending: true })

    if (error) throw error

    let sent = 0

    for (const row of rows ?? []) {
      const subject = `Contratto in scadenza tra ${row.days_remaining} giorni`
      const html = `
        <h2>Contratto in scadenza</h2>
        <p><strong>Modello:</strong> ${row.model_name}</p>
        <p><strong>Cliente:</strong> ${row.client_name}</p>
        <p><strong>Inizio:</strong> ${row.start_date}</p>
        <p><strong>Fine:</strong> ${row.end_date}</p>
        <p><strong>Giorni rimanenti:</strong> ${row.days_remaining}</p>
      `

      const provider = await sendEmail({
        apiKey: resendApiKey,
        from: emailFrom,
        to: row.agency_notification_email,
        subject,
        html,
      })

      const { error: insertError } = await supabase.from('contract_notification_log').insert({
        contract_id: row.contract_id,
        notification_type: 'expiry_warning',
        contract_end_date: row.end_date,
        sent_to: row.agency_notification_email,
        provider_message_id: provider?.id ?? null,
        metadata: { days_remaining: row.days_remaining },
      })

      if (insertError) throw insertError
      sent += 1
    }

    return Response.json({ ok: true, sent }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500, headers: corsHeaders })
  }
})
