'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DealRoom from './DealRoom'
import LockedDealRoom from './LockedDealRoom'

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
  const [isOwner, setIsOwner] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Anonymous: check localStorage for a previously unlocked session
        try {
          const stored = localStorage.getItem(`kunfa_dealroom_${companyId}`)
          if (stored) {
            setSessionId(stored)
            setUnlocked(true)
          }
        } catch {
          // ignore
        }
        setAuthChecked(true)
        return
      }

      setIsAuthenticated(true)
      setCurrentUserId(user.id)

      // Owner of the company (startup) or investor who added it
      const owner = companyUserId === user.id || companyAddedBy === user.id
      if (owner) {
        setIsOwner(true)
        setCanUpload(true)
        setCanShare(true)
        setUnlocked(true)
        setAuthChecked(true)
        return
      }

      // Investors who have this company in their pipeline can also upload
      const { data: deal } = await supabase
        .from('deals')
        .select('id')
        .eq('created_by', user.id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (deal) {
        setCanUpload(true)
      }

      // Logged-in non-owner: auto-unlock and log access silently
      setUnlocked(true)

      try {
        await fetch('/api/dealroom/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            companyId,
          }),
        })
      } catch (err) {
        console.error('Silent access log failed:', err)
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [companyId, companyUserId, companyAddedBy])

  // Wait for auth check before rendering
  if (!authChecked) return null

  // Anonymous and not unlocked → show email gate
  if (!isAuthenticated && !unlocked) {
    return (
      <LockedDealRoom
        companyId={companyId}
        companyName={companyName}
        onUnlock={(newSessionId) => {
          setSessionId(newSessionId)
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <DealRoom
      companyId={companyId}
      companyName={companyName}
      canUpload={canUpload}
      canShare={canShare}
      currentUserId={currentUserId}
      publicOnly={!isAuthenticated}
      sessionId={sessionId}
      trackingEnabled={!isOwner}
    />
  )
}
