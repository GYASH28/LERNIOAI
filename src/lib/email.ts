import 'server-only'

const resendApiUrl = 'https://api.resend.com/emails'
const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')

interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

export function buildVerificationUrl(token: string): string {
  return `${baseUrl}/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`
}

export function buildPasswordResetUrl(token: string): string {
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = buildVerificationUrl(token)
  await sendTransactionalEmail({
    to: email,
    subject: 'Verify your Lernio email',
    text: `Verify your Lernio email: ${url}`,
    html: renderEmail({
      title: 'Verify your Lernio email',
      body: 'Confirm this address so Lernio can protect your account and send important learning updates.',
      ctaLabel: 'Verify email',
      url,
    }),
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = buildPasswordResetUrl(token)
  await sendTransactionalEmail({
    to: email,
    subject: 'Reset your Lernio password',
    text: `Reset your Lernio password: ${url}`,
    html: renderEmail({
      title: 'Reset your Lernio password',
      body: 'Use this secure link to choose a new password. It expires in 1 hour.',
      ctaLabel: 'Reset password',
      url,
    }),
  })
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED')
    }

    console.warn(`[email:dev] Provider not configured — skipping: ${payload.subject} for ${payload.to}`)
    return
  }

  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300)
    throw new Error(`EMAIL_SEND_FAILED_${response.status}${detail ? `: ${detail}` : ''}`)
  }
}

function renderEmail(input: { title: string; body: string; ctaLabel: string; url: string }): string {
  const title = escapeHtml(input.title)
  const body = escapeHtml(input.body)
  const ctaLabel = escapeHtml(input.ctaLabel)
  const url = escapeHtml(input.url)

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#111827;">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">${body}</p>
                <a href="${url}" style="display:inline-block;border-radius:12px;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;">${ctaLabel}</a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">If the button does not work, open this link:<br><span style="word-break:break-all;">${url}</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}