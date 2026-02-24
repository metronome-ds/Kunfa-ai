'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function CompanyManagePage() {
  const [loading, setLoading] = useState(true)
  const [companyPage, setCompanyPage] = useState<{
    slug: string
    company_name: string
    overall_score: number | null
    is_public: boolean
    description: string | null
  } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('company_pages')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) setCompanyPage(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!companyPage) {
    return (
      <div className="max-w-2xl text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-3">No Company Page Yet</h1>
        <p className="text-gray-400 mb-6">Your company page will be created automatically after you submit your startup for scoring.</p>
        <Link href="/" className="inline-block bg-[#10B981] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#059669] transition">
          Get Your Score
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Your Company Page</h1>
        <Link
          href={`/company/${companyPage.slug}`}
          target="_blank"
          className="text-[#10B981] text-sm hover:underline"
        >
          View public page
        </Link>
      </div>

      <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700 space-y-4">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Company Name</p>
          <p className="text-white font-medium text-lg">{companyPage.company_name as string}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Kunfa Score</p>
          <p className="text-[#10B981] font-bold text-2xl">{(companyPage.overall_score as number) ?? '—'}</p>
        </div>

        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Public URL</p>
          <p className="text-blue-400 text-sm">
            {typeof window !== 'undefined' ? window.location.origin : ''}/company/{companyPage.slug as string}
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Visibility</p>
          <span className={`text-xs font-medium px-2 py-1 rounded ${companyPage.is_public ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {companyPage.is_public ? 'Public' : 'Private'}
          </span>
        </div>

        {companyPage.description ? (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Description</p>
            <p className="text-gray-300 text-sm">{String(companyPage.description)}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
