const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kunfa.ai'

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#0168FE;padding:24px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Kunfa</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Kunfa &mdash; Venture Intelligence | <a href="${BASE_URL}" style="color:#0168FE;text-decoration:none;">kunfa.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#0168FE;border-radius:8px;padding:12px 28px;">
      <a href="${url}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${text}</a>
    </td></tr>
  </table>`
}

// --- Team Invite ---

export function teamInviteEmail(params: {
  inviterName: string
  teamName: string
  role: string
  inviteeTitle?: string
  teamMemberId: string
}): { subject: string; html: string } {
  const { inviterName, teamName, role, inviteeTitle, teamMemberId } = params
  const roleLabel = inviteeTitle ? `${role} (${inviteeTitle})` : role

  return {
    subject: `You've been invited to join ${teamName} on Kunfa`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">You're invited!</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${roleLabel}</strong>.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        Kunfa is a venture intelligence platform where startups get AI-scored and investors discover, evaluate, and manage their deal pipeline across the GCC and beyond.
      </p>
      ${button('Accept Invitation', `${BASE_URL}/signup?invite=${teamMemberId}`)}
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
        If you already have a Kunfa account, sign in and you'll be automatically connected.
      </p>
    `),
  }
}

// --- Report Ready ---

export function reportReadyEmail(params: {
  companyName: string
  score: number
  submissionId: string
}): { subject: string; html: string } {
  const { companyName, score, submissionId } = params

  const badgeColor = score >= 80 ? '#059669' : score >= 60 ? '#0168FE' : score >= 40 ? '#d97706' : '#dc2626'

  return {
    subject: `Your Kunfa Readiness Report is ready — ${companyName}`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Your report is ready</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Your AI-powered investment memorandum for <strong>${companyName}</strong> has been generated.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr><td style="background:${badgeColor};color:#ffffff;font-size:18px;font-weight:700;padding:8px 20px;border-radius:8px;">
          ${score}/100
        </td></tr>
      </table>
      ${button('View Your Report', `${BASE_URL}/report/${submissionId}`)}
    `),
  }
}

// --- Payment Confirmation ---

export function paymentConfirmationEmail(params: {
  companyName: string
  slug: string | null
}): { subject: string; html: string } {
  const { companyName, slug } = params
  const ctaUrl = slug ? `${BASE_URL}/company/${slug}` : `${BASE_URL}/dashboard`

  return {
    subject: 'Payment confirmed — Kunfa Readiness Report',
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Payment confirmed</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        Thank you for purchasing the Kunfa Readiness Report for <strong>${companyName}</strong>. Your report is being generated and will be ready within 2 minutes.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f9fafb;border-radius:8px;padding:0;width:100%;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#6b7280;">Amount paid</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">$59.00 USD</p>
        </td></tr>
      </table>
      ${button('View Your Company Profile', ctaUrl)}
    `),
  }
}

// --- Welcome Email ---

export function welcomeEmail(params: {
  role: 'startup' | 'investor'
}): { subject: string; html: string } {
  const { role } = params
  const isStartup = role === 'startup'

  return {
    subject: 'Welcome to Kunfa — Venture Intelligence',
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome to Kunfa!</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        ${isStartup
          ? 'Get your startup scored by AI and connect with investors across the GCC.'
          : 'Discover AI-scored startups and manage your deal pipeline.'}
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        ${isStartup
          ? 'Upload your pitch deck and financials to receive an instant AI-powered investment readiness score — then share your profile with investors on the platform.'
          : 'Browse hundreds of scored startups, add them to your pipeline, track deal flow, and collaborate with your team — all from one dashboard.'}
      </p>
      ${button('Go to Dashboard', `${BASE_URL}/dashboard`)}
    `),
  }
}

// --- Deal Added to Pipeline ---

export function dealAddedEmail(params: {
  companyName: string
  slug: string | null
}): { subject: string; html: string } {
  const { companyName, slug } = params
  const ctaUrl = slug ? `${BASE_URL}/company/${slug}` : `${BASE_URL}/dashboard`

  return {
    subject: `An investor added ${companyName} to their pipeline`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Good news!</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        An investor is reviewing <strong>${companyName}</strong> on Kunfa. They've added your company to their deal pipeline.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        Make sure your company profile and deal room are up to date to make the best impression.
      </p>
      ${button('View Your Profile', ctaUrl)}
    `),
  }
}
