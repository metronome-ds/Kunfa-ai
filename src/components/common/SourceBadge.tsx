'use client'

interface SourceBadgeProps {
  source: string | null | undefined
}

const CONFIG: Record<string, { label: string; className: string }> = {
  startup_submission: { label: 'Startup', className: 'bg-emerald-50 text-emerald-700' },
  investor_invited: { label: 'Investor Added', className: 'bg-blue-50 text-blue-700' },
  admin_onboard: { label: 'Admin Added', className: 'bg-gray-100 text-gray-600' },
  tenant_onboarded: { label: 'Admin Added', className: 'bg-gray-100 text-gray-600' },
  investor_added: { label: 'Investor Added', className: 'bg-blue-50 text-blue-700' },
}

export function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null
  const config = CONFIG[source]
  if (!config) return null

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
