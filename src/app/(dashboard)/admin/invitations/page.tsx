'use client';

import { useEffect, useState } from 'react';
import { Ticket, Copy, Check, X, Plus, Package } from 'lucide-react';
import { useTenant, useTenantFeature } from '@/components/TenantProvider';

interface Invitation {
  id: string;
  code: string;
  type: 'startup' | 'investor';
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

function getStatus(inv: Invitation): 'active' | 'expired' | 'exhausted' | 'inactive' {
  if (!inv.is_active) return 'inactive';
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return 'expired';
  if (inv.uses_count >= inv.max_uses) return 'exhausted';
  return 'active';
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-100 text-gray-600',
  exhausted: 'bg-amber-100 text-amber-700',
  inactive: 'bg-red-100 text-red-700',
};

export default function InvitationsPage() {
  const { isTenantContext, isLoading } = useTenant();
  const hasFeature = useTenantFeature('invitation_codes');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [form, setForm] = useState({ type: 'startup', max_uses: 1, expires_at: '', notes: '' });
  const [bulkForm, setBulkForm] = useState({ type: 'investor', count: 5, expires_at: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isTenantContext) { setIsAdmin(false); return; }
    fetch('/api/tenant/admin-check')
      .then((r) => r.ok ? r.json() : { isAdmin: false })
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [isTenantContext]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/invitations');
      if (res.ok) {
        const d = await res.json();
        setInvitations(d.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const copy = (inv: Invitation) => {
    navigator.clipboard.writeText(inv.code);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const deactivate = async (inv: Invitation) => {
    if (!confirm(`Deactivate code ${inv.code}?`)) return;
    const res = await fetch(`/api/tenant/invitations/${inv.id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const createOne = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/tenant/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, count: 1 }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ type: 'startup', max_uses: 1, expires_at: '', notes: '' });
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  const createBulk = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/tenant/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: bulkForm.type, max_uses: 1, expires_at: bulkForm.expires_at, count: bulkForm.count }),
      });
      if (res.ok) {
        setBulkOpen(false);
        setBulkForm({ type: 'investor', count: 5, expires_at: '' });
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || isAdmin === null) {
    return <div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8]" /></div>;
  }

  if (!isTenantContext || !hasFeature) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Feature not available</h1>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-8 max-w-4xl mx-auto text-center"><h1 className="text-xl font-semibold">Admin access required</h1></div>;
  }

  const filtered = invitations.filter((inv) => {
    if (typeFilter && inv.type !== typeFilter) return false;
    if (statusFilter && getStatus(inv) !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitation Codes</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and manage invitation codes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBulkOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Package className="w-4 h-4" /> Bulk Generate
          </button>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6]">
            <Plus className="w-4 h-4" /> Generate Code
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All types</option>
          <option value="startup">Startup</option>
          <option value="investor">Investor</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="exhausted">Exhausted</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007CF8] mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-gray-900">No invitation codes</h2>
            <p className="text-xs text-gray-500 mt-1">Generate your first code to invite members.</p>
          </div>
        ) : (
          <table className="w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/50">
              <tr>
                {['Code', 'Type', 'Uses', 'Expires', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((inv) => {
                const status = getStatus(inv);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-sm">{inv.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${inv.type === 'startup' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.uses_count} / {inv.max_uses}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => copy(inv)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700" title="Copy">
                          {copiedId === inv.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {inv.is_active && (
                          <button onClick={() => deactivate(inv)} className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600" title="Deactivate">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-gray-900 mb-4">Generate Code</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="startup">Startup</option>
                  <option value="investor">Investor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Uses</label>
                <input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expires (optional)</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createOne} disabled={creating} className="px-3 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50">
                {creating ? 'Creating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-gray-900 mb-4">Bulk Generate</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={bulkForm.type} onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="startup">Startup</option>
                  <option value="investor">Investor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Count (1-50)</label>
                <input type="number" min="1" max="50" value={bulkForm.count} onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expires (optional)</label>
                <input type="date" value={bulkForm.expires_at} onChange={(e) => setBulkForm({ ...bulkForm, expires_at: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setBulkOpen(false)} className="px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createBulk} disabled={creating} className="px-3 py-2 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] disabled:opacity-50">
                {creating ? 'Generating…' : `Generate ${bulkForm.count}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
