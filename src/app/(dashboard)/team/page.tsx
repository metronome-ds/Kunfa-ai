'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, X, RefreshCw } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: string
  member_user_id: string | null
  created_at: string | null
  title: string | null
  source?: 'entity' | 'team'
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return 'bg-[#F0F7FF] text-[#007CF8]'
    case 'admin':
      return 'bg-red-100 text-red-700'
    case 'member':
      return 'bg-emerald-100 text-emerald-700'
    case 'observer':
    case 'viewer':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'accepted':
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'accepted':
    case 'active':
      return 'Active'
    case 'pending':
      return 'Pending'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [entityMode, setEntityMode] = useState(false)

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState<Record<string, boolean>>({})
  const [resending, setResending] = useState<string | null>(null)

  // Invite form
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team')
      if (!res.ok) throw new Error('Failed to load team')
      const json = await res.json()
      setMembers(json.data || [])
      setEntityMode(!!json.entityMode)

      if (json.entityMode) {
        // In entity mode, selfRole comes from the API
        const selfRole = json.selfRole
        setCanManage(selfRole === 'owner' || selfRole === 'admin')
      }

      setError('')
    } catch {
      setError('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()

    // Legacy team-context for non-entity mode
    fetch('/api/team-context')
      .then(r => r.json())
      .then(data => {
        const role = data?.context?.memberRole
        // Only set canManage from team-context if NOT in entity mode
        // (entity mode sets it in fetchTeam)
        setCanManage(prev => prev || role === 'owner' || role === 'admin')
      })
      .catch(() => {})
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    setError('')

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')

      setSuccess(data.message || `Invitation sent to ${inviteEmail}`)
      setInviteName('')
      setInviteEmail('')
      setInviteRole('member')
      setShowInvite(false)
      fetchTeam()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      setSuccess('Role updated')
      fetchTeam()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove')
      setSuccess('Member removed')
      fetchTeam()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleResend = async (memberId: string, email: string) => {
    setResending(memberId)
    setError('')
    try {
      const res = await fetch('/api/team/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend')
      setSuccess(`Invite resent to ${email}`)
      setTimeout(() => setSuccess(''), 3000)
      setResendCooldown((prev) => ({ ...prev, [memberId]: true }))
      setTimeout(() => {
        setResendCooldown((prev) => ({ ...prev, [memberId]: false }))
      }, 30000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite')
    } finally {
      setResending(null)
    }
  }

  // Role options differ between entity mode and legacy
  const roleOptions = entityMode
    ? [
        { value: 'admin', label: 'Admin — Full access' },
        { value: 'member', label: 'Member — Can view and manage deals' },
        { value: 'observer', label: 'Observer — Read-only access' },
      ]
    : [
        { value: 'admin', label: 'Admin — Full access' },
        { value: 'member', label: 'Member — Can view and manage deals' },
        { value: 'viewer', label: 'Viewer — Read-only access' },
      ]

  // Role options for the inline select (shorter labels)
  const inlineRoleOptions = entityMode
    ? ['owner', 'admin', 'member', 'observer']
    : ['admin', 'member', 'viewer']

  // Owner row: in entity mode, the owner comes from the data directly (no
  // synthetic "owner" row). In legacy mode, it's the first entry with id='owner'.
  const isOwnerRow = (m: TeamMember) =>
    entityMode ? m.role === 'owner' : m.id === 'owner'

  const inputClass =
    'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007CF8]/20 focus:border-[#007CF8]'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#007CF8]" />
            Team
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your team members and permissions
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#007CF8] text-white rounded-lg text-sm font-semibold hover:bg-[#0066D6] transition"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-[#007CF8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading team...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F9FB] border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-[#F8F9FB] transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-600">
                          {member.name ? getInitials(member.name) : '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name || 'Pending'}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                        {member.title && (
                          <p className="text-xs text-gray-400">{member.title}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {isOwnerRow(member) || !canManage ? (
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${getRoleBadge(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value)}
                        className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007CF8]"
                      >
                        {inlineRoleOptions.map((r) => (
                          <option key={r} value={r}>
                            {getRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(member.status)}`}>
                      {getStatusLabel(member.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        {!isOwnerRow(member) && member.status === 'pending' && (
                          <button
                            onClick={() => handleResend(member.id, member.email)}
                            disabled={resending === member.id || resendCooldown[member.id]}
                            className="px-2 py-1 text-xs font-medium text-[#007CF8] hover:bg-blue-50 transition rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            title="Resend invite"
                          >
                            <RefreshCw className={`w-3 h-3 ${resending === member.id ? 'animate-spin' : ''}`} />
                            {resendCooldown[member.id] ? 'Sent' : 'Resend'}
                          </button>
                        )}
                        {!isOwnerRow(member) && (
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {members.length === 0 && (
            <div className="text-center py-12 px-6">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">
                No team members yet.{canManage ? ' Invite your first member to get started.' : ''}
              </p>
              {canManage && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="text-[#007CF8] text-sm font-semibold hover:underline"
                >
                  Invite a team member
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={inputClass}
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={inviting || !inviteName || !inviteEmail}
                  className="flex-1 py-2.5 bg-[#007CF8] text-white rounded-lg font-semibold text-sm hover:bg-[#0066D6] transition disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
