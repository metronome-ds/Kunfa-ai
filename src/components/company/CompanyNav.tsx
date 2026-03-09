'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import KunfaLogo from '@/components/common/KunfaLogo'

export function CompanyNav() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoaded(true)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setUserRole(profile?.role || null)
      setLoaded(true)
    }

    check()
  }, [])

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/">
          <KunfaLogo height={28} />
        </Link>

        <div className="flex items-center gap-3">
          {loaded && (
            <>
              {userRole === 'startup' ? (
                <Link
                  href="/dashboard"
                  className="bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#059669] transition"
                >
                  See My Profile
                </Link>
              ) : userRole === 'investor' ? (
                <Link
                  href="/deals"
                  className="bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#059669] transition"
                >
                  Browse Companies
                </Link>
              ) : (
                <Link
                  href="/"
                  className="bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#059669] transition"
                >
                  Get Your Score
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
