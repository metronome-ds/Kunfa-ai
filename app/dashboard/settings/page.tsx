'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [email, setEmail] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, linkedin_url')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setCompanyName(profile.company_name || '')
        setLinkedinUrl(profile.linkedin_url || '')
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        company_name: companyName,
        linkedin_url: linkedinUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) {
      setMessage('Failed to save. Please try again.')
    } else {
      setMessage('Settings saved successfully.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>

      <form onSubmit={handleSave} className="bg-[#1E293B] rounded-xl p-6 border border-gray-700 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            placeholder="Your company"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL</label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full px-4 py-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        {message && (
          <div className={`text-sm p-3 rounded-lg ${message.includes('Failed') ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-green-900/20 text-green-400 border border-green-800'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[#10B981] text-white rounded-lg font-semibold hover:bg-[#059669] transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
