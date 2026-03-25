'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DealRoom from './DealRoom'

interface DealRoomSectionProps {
  companyId: string
  companyName: string
  companyUserId: string | null
  companyAddedBy: string | null
}

export default function DealRoomSection({ companyId, companyName, companyUserId, companyAddedBy }: DealRoomSectionProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [canUpload, setCanUpload] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setAuthChecked(true)
        return
      }

      setIsAuthenticated(true)
      setCurrentUserId(user.id)

      // Can upload/share if user is the company owner or the investor who added it
      const isOwner = companyUserId === user.id || companyAddedBy === user.id
      if (isOwner) {
        setCanUpload(true)
        setCanShare(true)
        setAuthChecked(true)
        return
      }

      // Also allow investors who have this company in their pipeline
      const { data: deal } = await supabase
        .from('deals')
        .select('id')
        .eq('created_by', user.id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (deal) {
        setCanUpload(true)
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [companyId, companyUserId, companyAddedBy])

  // Wait for auth check before rendering
  if (!authChecked) return null

  return (
    <DealRoom
      companyId={companyId}
      companyName={companyName}
      canUpload={canUpload}
      canShare={canShare}
      currentUserId={currentUserId}
      publicOnly={!isAuthenticated}
    />
  )
}
