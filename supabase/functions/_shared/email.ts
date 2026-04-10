const RESEND_API_URL = 'https://api.resend.com/emails'

export async function sendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
}: {
  apiKey: string
  from: string
  to: string
  subject: string
  html: string
}) {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email provider error: ${res.status} ${text}`)
  }

  return await res.json()
}
