const BASE_URL = 'https://www.kunfa.ai'

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#0168FE;padding:28px 32px;text-align:center;">
          <img src="https://akvjxobgnbbljmtvrlhk.supabase.co/storage/v1/object/public/documents/Brand/kunfa-logo.png" alt="Kunfa" height="32" style="display:inline-block;" />
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            <a href="${BASE_URL}" style="color:#0168FE;text-decoration:none;">kunfa.ai</a> &mdash; Venture Intelligence for the GCC
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

// --- Claim Invite ---

export function claimInviteEmail(params: {
  investorName: string
  companyName: string
  score: number | null
  claimToken: string
}): { subject: string; html: string } {
  const { investorName, companyName, score, claimToken } = params
  const claimUrl = `${BASE_URL}/claim/${claimToken}`

  const scoreSection = score
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr><td style="background:#0168FE;color:#ffffff;font-size:18px;font-weight:700;padding:8px 20px;border-radius:8px;">
          ${score}/100
        </td></tr>
      </table>`
    : ''

  return {
    subject: `Your company ${companyName} is on Kunfa — claim your profile`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Claim your company profile</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${investorName}</strong> has added <strong>${companyName}</strong> to Kunfa, a venture intelligence platform where investors discover and evaluate startups.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
        Your company profile is live and visible to investors. Claim it to take ownership, update your information, and manage your data room.
      </p>
      ${scoreSection}
      ${button('Claim Your Profile', claimUrl)}
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
        If you don&rsquo;t recognize this company, you can safely ignore this email.
      </p>
    `),
  }
}

// --- Claim Approved ---

export function claimApprovedEmail(params: {
  companyName: string
  slug: string
}): { subject: string; html: string } {
  const { companyName, slug } = params
  const profileUrl = `${BASE_URL}/company/${slug}`

  return {
    subject: `Your claim for ${companyName} has been approved`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Claim approved!</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        Your claim for <strong>${companyName}</strong> on Kunfa has been approved. You now have full ownership of this company profile.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        You can now update your company information, manage your data room, and connect with investors.
      </p>
      ${button('View Your Profile', profileUrl)}
    `),
  }
}

// --- Company Invite (investor invites founder) ---

export function companyInviteEmail(params: {
  investorName: string
  companyName: string
  claimToken: string
  personalMessage?: string
}): { subject: string; html: string } {
  const { investorName, companyName, claimToken, personalMessage } = params
  const claimUrl = `${BASE_URL}/claim/${claimToken}`

  const messageBlock = personalMessage
    ? `<div style="margin:16px 0;padding:12px 16px;border-left:4px solid #0168FE;background:#f0f7ff;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">&ldquo;${personalMessage}&rdquo;</p>
      </div>`
    : ''

  return {
    subject: `${investorName} has invited you to join Kunfa`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">You've been invited to Kunfa</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${investorName}</strong> has invited <strong>${companyName}</strong> to join Kunfa &mdash; the AI-powered venture intelligence platform for the GCC.
      </p>
      ${messageBlock}
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
        Create your company profile, upload your pitch deck, and get an instant AI-powered investment readiness score. It takes less than 5 minutes.
      </p>
      ${button('Create Your Profile', claimUrl)}
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
        This invite was sent by ${investorName} via Kunfa.
      </p>
    `),
  }
}

// --- Company Claimed (notify investor) ---

export function companyClaimedNotificationEmail(params: {
  companyName: string
  slug: string | null
  score?: number | null
}): { subject: string; html: string } {
  const { companyName, slug, score } = params
  const ctaUrl = slug ? `${BASE_URL}/company/${slug}` : `${BASE_URL}/pipeline`

  const scoreSection = score
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr><td style="background:#0168FE;color:#ffffff;font-size:18px;font-weight:700;padding:8px 20px;border-radius:8px;">
          ${score}/100
        </td></tr>
      </table>`
    : ''

  return {
    subject: `${companyName} has joined Kunfa!`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Great news!</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${companyName}</strong> has claimed their profile on Kunfa. The founder is now managing their company page.
      </p>
      ${scoreSection}
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        You can view their updated profile and continue managing them in your deal pipeline.
      </p>
      ${button('View Company', ctaUrl)}
    `),
  }
}

// --- Deal Room Access Nurture ---

export function dealroomAccessNurtureEmail(params: {
  companyName: string
}): { subject: string; html: string } {
  const { companyName } = params

  return {
    subject: `You viewed ${companyName} on Kunfa`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Thanks for checking out ${companyName}</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        You just unlocked the deal room for <strong>${companyName}</strong> on Kunfa.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        Create your free investor profile to save deals, manage your pipeline, and get AI-scored deal flow from across the GCC and beyond.
      </p>
      ${button('Create Your Profile', `${BASE_URL}/signup`)}
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
        Kunfa is the AI-native platform for venture intelligence &mdash; join hundreds of investors and founders already on the platform.
      </p>
    `),
  }
}

// --- Investor Review Invite ---

export function investorReviewInviteEmail(params: {
  founderName: string
  companyName: string
  slug: string
  score: number | null
  personalMessage?: string
}): { subject: string; html: string } {
  const { founderName, companyName, slug, score, personalMessage } = params
  const companyUrl = `${BASE_URL}/company/${slug}`

  const scoreSection = score
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr><td style="background:#0168FE;color:#ffffff;font-size:18px;font-weight:700;padding:8px 20px;border-radius:8px;">
          ${score}/100
        </td></tr>
      </table>`
    : ''

  const messageBlock = personalMessage
    ? `<div style="margin:16px 0;padding:12px 16px;border-left:4px solid #0168FE;background:#f0f7ff;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">&ldquo;${personalMessage}&rdquo;</p>
      </div>`
    : ''

  return {
    subject: `${founderName} invited you to review ${companyName} on Kunfa`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">You're invited to review a deal</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${founderName}</strong> has invited you to review <strong>${companyName}</strong> on Kunfa &mdash; the AI-powered venture intelligence platform.
      </p>
      ${messageBlock}
      ${scoreSection}
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
        View their company profile, AI-scored pitch deck analysis, and deal room documents.
      </p>
      ${button('View Company Profile', companyUrl)}
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
        This invite was sent by ${founderName} via Kunfa.
      </p>
    `),
  }
}

// --- Claim Rejected ---

export function claimRejectedEmail(params: {
  companyName: string
  reason?: string
}): { subject: string; html: string } {
  const { companyName, reason } = params

  return {
    subject: `Your claim for ${companyName} was not approved`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Claim not approved</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        Your claim for <strong>${companyName}</strong> on Kunfa was reviewed and not approved.
      </p>
      ${reason ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.6;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        If you believe this was a mistake, please contact us at support@kunfa.ai.
      </p>
      ${button('Go to Kunfa', BASE_URL)}
    `),
  }
}

// --- Profile Share Invitation ---

export function profileShareEmail(params: {
  companyName: string
  oneLiner: string | null
  score: number | null
  sharerName: string
  recipientName: string | null
  personalMessage: string | null
  shareToken: string
  slug: string
}): { subject: string; html: string } {
  const { companyName, oneLiner, score, sharerName, recipientName, personalMessage, shareToken, slug } = params
  const shareUrl = `${BASE_URL}/company/${slug}?share=${shareToken}`
  const greeting = recipientName ? `Hi ${recipientName.split(' ')[0]},` : 'Hi,'

  const messageBlock = personalMessage
    ? `<div style="margin:16px 0;padding:12px 16px;border-left:4px solid #0168FE;background:#f0f7ff;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">&ldquo;${personalMessage}&rdquo;</p>
      </div>`
    : ''

  const scoreBlock = score != null
    ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Kunfa Score: <strong style="color:#111827;">${score}/100</strong></p>`
    : ''

  return {
    subject: `${sharerName} invited you to view ${companyName} on Kunfa`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">You're invited to view ${companyName}</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        ${greeting}
      </p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${sharerName}</strong> has invited you to view <strong>${companyName}</strong>'s profile and deal room on Kunfa.
      </p>
      ${messageBlock}
      <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${companyName}</p>
        ${oneLiner ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${oneLiner}</p>` : ''}
        ${scoreBlock}
      </div>
      ${button('View Deal Room', shareUrl)}
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
        This invitation was sent by ${sharerName} via Kunfa. This link expires in 30 days.
      </p>
    `),
  }
}
