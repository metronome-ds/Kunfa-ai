'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardNav() {
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || '')
        setAvatarUrl(profile.avatar_url || '')
      } else {
        setUserName(user.email?.split('@')[0] || '')
      }
    }
    loadProfile()
  }, [supabase])

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#1E293B] border-b border-gray-700 flex items-center justify-between px-6 z-40">
      <div>
        <h1 className="text-white font-semibold text-lg">Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-300 text-sm">{userName}</span>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {userName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
