import { sendEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/services/provider-apply
 * Public — sends a provider application email to ds@kunfa.ai
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, company, services, website, message } = body

    if (!name || !email || !services || (Array.isArray(services) && services.length === 0)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, services' },
        { status: 400 }
      )
    }

    const serviceList = Array.isArray(services) ? services.join(', ') : services

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#007CF8;padding:24px 32px;color:#fff;">
      <h1 style="margin:0;font-size:18px;">New Provider Application</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;width:120px;">Name</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Email</td><td style="padding:8px 0;font-size:14px;color:#111827;">${email}</td></tr>
        ${company ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Company</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${company}</td></tr>` : ''}
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Services</td><td style="padding:8px 0;font-size:14px;color:#007CF8;font-weight:600;">${serviceList}</td></tr>
        ${website ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Website</td><td style="padding:8px 0;font-size:14px;color:#111827;">${website}</td></tr>` : ''}
      </table>
      ${message ? `<div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #007CF8;"><p style="margin:0;font-size:13px;color:#6b7280;margin-bottom:4px;">Message</p><p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${message}</p></div>` : ''}
    </div>
  </div>
</body>
</html>`

    await sendEmail({
      to: 'ds@kunfa.ai',
      subject: `New Provider Application: ${company || name}`,
      html,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/services/provider-apply:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
