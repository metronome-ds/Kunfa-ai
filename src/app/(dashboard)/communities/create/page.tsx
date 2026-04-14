'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FeatureGate from '@/components/common/FeatureGate'
import { Users, Globe, Lock, FileKey, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

export default function CreateCommunityPage() {
  return (
    <FeatureGate feature="create_community">
      <CreateCommunityForm />
    </FeatureGate>
  )
}

function CreateCommunityForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [thesis, setThesis] = useState('')

  // Step 2
  const [mode, setMode] = useState<'network' | 'syndicate'>('network')

  // Step 3
  const [membershipType, setMembershipType] = useState<'open' | 'invite' | 'application'>('invite')

  // Step 4
  const [dealSharing, setDealSharing] = useState<'admin_only' | 'all_members'>('admin_only')

  // Step 5
  const [emails, setEmails] = useState('')

  async function handleCreate() {
    if (!name.trim()) {
      setError('Community name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          thesis: thesis.trim() || null,
          mode,
          membershipType,
          dealSharing,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create community')
        setLoading(false)
        return
      }

      // Invite members if emails provided
      const emailList = emails
        .split(/[,\n]+/)
        .map(e => e.trim())
        .filter(e => e.includes('@'))

      if (emailList.length > 0) {
        await fetch(`/api/communities/${data.community.slug}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailList }),
        }).catch(() => {})
      }

      router.push(`/communities/${data.community.slug}`)
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button
        onClick={() => router.push('/communities')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Communities
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a Community</h1>
      <p className="text-gray-500 mb-8">Set up a private deal-sharing space for your investor network.</p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
              s < step ? 'bg-emerald-100 text-emerald-700' :
              s === step ? 'bg-[#007CF8] text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 5 && <div className={`w-8 h-0.5 ${s < step ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Community Details</h2>
              <p className="text-sm text-gray-500">Name your community and describe its purpose.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]"
                placeholder="e.g. GCC Angel Network"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
                placeholder="What is this community about?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investment Thesis</label>
              <textarea
                value={thesis}
                onChange={e => setThesis(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none"
                placeholder="e.g. Seed-stage SaaS in MENA"
              />
            </div>
          </div>
        )}

        {/* Step 2: Mode */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Community Mode</h2>
              <p className="text-sm text-gray-500">Choose how your community operates.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('network')}
                className={`text-left p-5 rounded-xl border-2 transition ${
                  mode === 'network' ? 'border-[#007CF8] bg-[#007CF8]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className={`w-6 h-6 mb-3 ${mode === 'network' ? 'text-[#007CF8]' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900 mb-1">Network</div>
                <p className="text-sm text-gray-500">Lightweight deal sharing and discussion. Great for angel networks and investor circles.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode('syndicate')}
                className={`text-left p-5 rounded-xl border-2 transition ${
                  mode === 'syndicate' ? 'border-[#007CF8] bg-[#007CF8]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileKey className={`w-6 h-6 mb-3 ${mode === 'syndicate' ? 'text-[#007CF8]' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900 mb-1">Syndicate</div>
                <p className="text-sm text-gray-500">Structured IC process with capital commitments. For fund managers and formal groups.</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Membership */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Membership Type</h2>
              <p className="text-sm text-gray-500">How can people join your community?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: 'invite', label: 'Invite Only', desc: 'Only people you invite can join.', icon: Lock },
                { value: 'open', label: 'Open', desc: 'Anyone on Kunfa can join.', icon: Globe },
                { value: 'application', label: 'Application', desc: 'People request to join, you approve.', icon: Users },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMembershipType(opt.value as typeof membershipType)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                    membershipType === opt.value ? 'border-[#007CF8] bg-[#007CF8]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 ${membershipType === opt.value ? 'text-[#007CF8]' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    <div className="text-sm text-gray-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Deal sharing */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Deal Sharing Permissions</h2>
              <p className="text-sm text-gray-500">Who can share deals in this community?</p>
            </div>
            <div className="space-y-3">
              {[
                { value: 'admin_only', label: 'Admins Only', desc: 'Only admins and deal leads can share deals.' },
                { value: 'all_members', label: 'All Members', desc: 'Any member can share deals.' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDealSharing(opt.value as typeof dealSharing)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${
                    dealSharing === opt.value ? 'border-[#007CF8] bg-[#007CF8]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{opt.label}</div>
                  <div className="text-sm text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Invite */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Invite Members</h2>
              <p className="text-sm text-gray-500">Add email addresses to invite your first members. You can skip this and invite later.</p>
            </div>
            <textarea
              value={emails}
              onChange={e => setEmails(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8] resize-none font-mono text-sm"
              placeholder={"ahmed@example.com\nsarah@example.com\nmichael@example.com"}
            />
            <p className="text-xs text-gray-400">One email per line, or comma-separated.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setStep((step - 1) as Step)}
            disabled={step === 1}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setError('Community name is required')
                  return
                }
                setError('')
                setStep((step + 1) as Step)
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#007CF8] text-white text-sm font-medium rounded-lg hover:bg-[#0066D6] transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
