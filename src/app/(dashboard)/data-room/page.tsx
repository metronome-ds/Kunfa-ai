'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FolderOpen, Rocket } from 'lucide-react'
import DealRoom from '@/components/dealroom/DealRoom'
import RescoringModal from '@/components/scoring/RescoringModal'
import Link from 'next/link'

export default function DataRoomPage() {
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [currentScore, setCurrentScore] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [showRescore, setShowRescore] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setUserId(user.id)
      setUserEmail(user.email || '')

      const { data: company } = await supabase
        .from('company_pages')
        .select('id, company_name, overall_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (company) {
        setCompanyId(company.id)
        setCompanyName(company.company_name)
        setCurrentScore(company.overall_score)
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0168FE]" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0168FE]/10 flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-8 h-8 text-[#0168FE]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Your Deal Room</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Get your Kunfa Score to create your company profile and deal room. Upload pitch decks, financials, and more to share with investors.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0168FE] text-white rounded-lg font-semibold hover:bg-[#0050CC] transition"
        >
          <Rocket className="w-5 h-5" />
          Get Your Kunfa Score
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <DealRoom
        companyId={companyId}
        companyName={companyName}
        canUpload={true}
        canShare={true}
        currentUserId={userId}
        onRequestRescore={() => setShowRescore(true)}
      />
      <RescoringModal
        isOpen={showRescore}
        onClose={() => setShowRescore(false)}
        companyPageId={companyId}
        companyName={companyName}
        currentScore={currentScore}
        email={userEmail}
      />
    </div>
  )
}
