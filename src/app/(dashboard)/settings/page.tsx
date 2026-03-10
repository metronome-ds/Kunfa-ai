'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Save, LogOut, Check, Lock, AlertTriangle } from 'lucide-react';
import { STAGES, INDUSTRIES } from '@/lib/constants';

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#0168FE] focus:ring-2 focus:ring-[#0168FE]/20 outline-none transition-all';
const SELECT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#0168FE] focus:ring-2 focus:ring-[#0168FE]/20 outline-none transition-all';
const DISABLED_CLASS = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed';

function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <Lock className="w-5 h-5 text-gray-400" />
        Change Password
      </h2>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <Check className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Password updated successfully.</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            minLength={6}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            minLength={6}
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 bg-[#0168FE] hover:bg-[#0050CC] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<string>('');

  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Startup fields
  const [companyName, setCompanyName] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyStage, setCompanyStage] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Investor fields
  const [fundName, setFundName] = useState('');
  const [aum, setAum] = useState('');
  const [ticketSizeMin, setTicketSizeMin] = useState('');
  const [ticketSizeMax, setTicketSizeMax] = useState('');
  const [stageFocus, setStageFocus] = useState('');
  const [sectorInterests, setSectorInterests] = useState('');
  const [geoFocus, setGeoFocus] = useState('');
  const [investmentThesis, setInvestmentThesis] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser({ id: authUser.id, email: authUser.email || '' });
      setEmail(authUser.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profile) {
        setRole(profile.role || '');
        setFullName(profile.full_name || '');
        setLinkedinUrl(profile.linkedin_url || '');

        // Startup fields
        setCompanyName(profile.company_name || '');
        setOneLiner(profile.one_liner || '');
        setIndustry(profile.industry || '');
        setCompanyStage(profile.company_stage || '');
        setCompanyWebsite(profile.company_website || '');
        setCompanyCountry(profile.company_country || '');
        setJobTitle(profile.job_title || '');

        // Investor fields
        setFundName(profile.fund_name || '');
        setAum(profile.aum ? String(profile.aum) : '');
        setTicketSizeMin(profile.ticket_size_min ? String(profile.ticket_size_min) : '');
        setTicketSizeMax(profile.ticket_size_max ? String(profile.ticket_size_max) : '');
        setStageFocus(profile.stage_focus || '');
        setSectorInterests(profile.sector_interests || '');
        setGeoFocus(profile.geo_focus || '');
        setInvestmentThesis(profile.investment_thesis || '');
      }

      setIsLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updates: Record<string, unknown> = {
        full_name: fullName,
        linkedin_url: linkedinUrl || null,
        updated_at: new Date().toISOString(),
      };

      const isStartup = role === 'startup' || role === 'founder';

      if (isStartup) {
        updates.company_name = companyName || null;
        updates.one_liner = oneLiner || null;
        updates.industry = industry || null;
        updates.company_stage = companyStage || null;
        updates.company_website = companyWebsite || null;
        updates.company_country = companyCountry || null;
        updates.job_title = jobTitle || null;
      } else {
        updates.fund_name = fundName || null;
        updates.aum = aum ? Number(aum) : null;
        updates.ticket_size_min = ticketSizeMin ? Number(ticketSizeMin) : null;
        updates.ticket_size_max = ticketSizeMax ? Number(ticketSizeMax) : null;
        updates.stage_focus = stageFocus || null;
        updates.sector_interests = sectorInterests || null;
        updates.geo_focus = geoFocus || null;
        updates.investment_thesis = investmentThesis || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      alert(message);
      setIsDeleting(false);
    }
  };

  const isStartup = role === 'startup' || role === 'founder';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#0168FE] mb-4" />
          <p className="text-gray-500 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and profile information.</p>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <Check className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">Settings saved successfully.</p>
        </div>
      )}

      {/* Account Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} disabled className={DISABLED_CLASS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <input type="text" value={isStartup ? 'Startup' : role === 'investor' ? 'Investor' : role || '—'} disabled className={DISABLED_CLASS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
            <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className={INPUT_CLASS} />
          </div>
        </div>
      </div>

      {/* Startup-specific Section */}
      {isStartup && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Company Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Title</label>
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="CEO & Co-Founder" className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">One-Liner</label>
              <input type="text" value={oneLiner} onChange={(e) => setOneLiner(e.target.value.slice(0, 160))} maxLength={160} placeholder="What does your company do?" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={SELECT_CLASS}>
                <option value="">Select...</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage</label>
              <select value={companyStage} onChange={(e) => setCompanyStage(e.target.value)} className={SELECT_CLASS}>
                <option value="">Select...</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country / HQ</label>
              <input type="text" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} placeholder="United States" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" className={INPUT_CLASS} />
            </div>
          </div>
        </div>
      )}

      {/* Investor-specific Section */}
      {role === 'investor' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Investment Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fund Name</label>
              <input type="text" value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Your fund or firm" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">AUM ($)</label>
              <input type="number" value={aum} onChange={(e) => setAum(e.target.value)} placeholder="Assets under management" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Check Size ($)</label>
              <input type="number" value={ticketSizeMin} onChange={(e) => setTicketSizeMin(e.target.value)} placeholder="e.g. 50000" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Check Size ($)</label>
              <input type="number" value={ticketSizeMax} onChange={(e) => setTicketSizeMax(e.target.value)} placeholder="e.g. 500000" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage Focus</label>
              <input type="text" value={stageFocus} onChange={(e) => setStageFocus(e.target.value)} placeholder="e.g. Seed, Series A" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector Interests</label>
              <input type="text" value={sectorInterests} onChange={(e) => setSectorInterests(e.target.value)} placeholder="e.g. FinTech, HealthTech" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Geographic Focus</label>
              <input type="text" value={geoFocus} onChange={(e) => setGeoFocus(e.target.value)} placeholder="e.g. MENA, US, Global" className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Investment Thesis</label>
              <textarea value={investmentThesis} onChange={(e) => setInvestmentThesis(e.target.value)} rows={3} placeholder="Describe your investment strategy and thesis..." className={INPUT_CLASS} />
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <ChangePasswordSection />

      {/* Actions */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-[#0168FE] hover:bg-[#0050CC] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-300 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-lg font-medium text-sm transition"
        >
          Delete My Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>

            <p className="text-sm text-gray-700 mb-3">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>

            <p className="text-sm text-gray-600 mb-4">
              {isStartup
                ? 'Your company profile, scores, and all uploaded documents will be permanently removed.'
                : 'Your pipeline, watchlist, portfolio, team, and all deal data will be permanently removed.'}
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || isDeleting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#EF4444] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
