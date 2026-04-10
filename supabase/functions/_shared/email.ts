const RESEND_API_URL = 'https://api.resend.com/emails'

function normalizeEmailAddress(value: string) {
  return value.trim().replace(/^"+|"+$/g, '')
}

function isSimpleEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

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
  const normalizedFrom = normalizeEmailAddress(from)
  const normalizedTo = normalizeEmailAddress(to)

  if (!isSimpleEmail(normalizedTo)) {
    throw new Error(`Recipient email is invalid after normalization: ${normalizedTo}`)
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: normalizedFrom, to: normalizedTo, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email provider error: ${res.status} ${text}`)
  }

  return await res.json()
}
