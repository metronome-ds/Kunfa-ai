import { Resend } from 'resend'

const FROM_EMAIL = 'Kunfa <onboarding@resend.dev>'

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email to:', to)
      return false
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[Email] Failed to send:', error)
      return false
    }

    console.log(`[Email] Sent "${subject}" to ${to}`)
    return true
  } catch (err) {
    console.error('[Email] Unexpected error sending email:', err)
    return false
  }
}
