'use client'

import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'

interface UserRow {
  id: string
  user_id: string
  full_name: string | null
  email: string
  role: string | null
  fund_name: string | null
  company_name: string | null
  created_at: string
  active_entity_id: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setUsers(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? users.filter(u =>
        [u.full_name, u.email, u.fund_name, u.company_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : users

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
        marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}>Users</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            {loading ? 'Loading...' : `${users.length} total users`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-sunk)',
        border: '1px solid var(--line)', padding: '10px 14px', borderRadius: 6,
        marginBottom: 24, maxWidth: 400,
      }}>
        <Search size={14} style={{ color: 'var(--ink-mute)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--ink)',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunk)' }}>
              {['Name', 'Email', 'Role', 'Entity / Fund', 'Joined'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 18px', fontSize: 10,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Loading users...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>No users found</td></tr>
            ) : (
              filtered.slice(0, 100).map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500 }}>{u.full_name || '—'}</td>
                  <td style={{ padding: '12px 18px', fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                      background: u.role === 'investor' ? 'var(--accent-soft)' : 'var(--bg-sunk)',
                      color: u.role === 'investor' ? 'var(--accent-ink)' : 'var(--ink-soft)',
                      textTransform: 'capitalize',
                    }}>
                      {u.role || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--ink-mute)' }}>{u.fund_name || u.company_name || '—'}</td>
                  <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--ink-mute)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
