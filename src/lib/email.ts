import 'server-only'

const RESEND_API_URL = 'https://api.resend.com/emails'

interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  purpose: 'verification' | 'password-reset'
}

type EmailProviderState = 'configured' | 'unconfigured'

function getBaseUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim()
  const vercelUrl = process.env.VERCEL_URL?.trim()
  const baseUrl = configuredUrl || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

  return baseUrl.replace(/\/+$/, '')
}

function getMailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()

  if (!apiKey || !from) return null

  return { apiKey, from }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function redactEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'recipient'
  return `${local.slice(0, 2)}***@${domain}`
}

export function getEmailProviderState(): EmailProviderState {
  return getMailConfig() ? 'configured' : 'unconfigured'
}

async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const config = getMailConfig()

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email provider is not configured')
    }

    console.warn(
      `[email:dev] ${message.purpose} email prepared for ${redactEmail(message.to)}. Configure RESEND_API_KEY and EMAIL_FROM to send it.`,
    )
    return
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Email provider rejected ${message.purpose} email with status ${response.status}`)
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${getBaseUrl()}/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`
  const safeUrl = escapeHtml(url)

  await sendTransactionalEmail({
    to: email,
    purpose: 'verification',
    subject: 'Verify your Lernio AI email',
    text: `Verify your Lernio AI email: ${url}`,
    html: `
      <p>Welcome to Lernio AI.</p>
      <p>Use this secure link to verify your email address:</p>
      <p><a href="${safeUrl}">Verify email</a></p>
      <p>This link expires soon. If you did not request it, you can ignore this message.</p>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`
  const safeUrl = escapeHtml(url)

  await sendTransactionalEmail({
    to: email,
    purpose: 'password-reset',
    subject: 'Reset your Lernio AI password',
    text: `Reset your Lernio AI password: ${url}`,
    html: `
      <p>We received a request to reset your Lernio AI password.</p>
      <p>Use this secure link to choose a new password:</p>
      <p><a href="${safeUrl}">Reset password</a></p>
      <p>This link expires soon. If you did not request it, you can ignore this message.</p>
    `,
  })
}
