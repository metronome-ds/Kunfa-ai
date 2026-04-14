'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Save, LogOut, Check, Lock, AlertTriangle, User, Building2, Briefcase, CreditCard, Tag } from 'lucide-react';
import { STAGES, INDUSTRIES } from '@/lib/constants';

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all';
const SELECT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-[#007CF8] focus:ring-2 focus:ring-[#007CF8]/20 outline-none transition-all';
const DISABLED_CLASS = 'w-full rounded-lg border border-gray-200 bg-[#F8F9FB] px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1.5';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all ${
      type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {type === 'success' && <Check className="w-4 h-4" />}
      {type === 'error' && <AlertTriangle className="w-4 h-4" />}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

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
          <label className={LABEL_CLASS}>New Password</label>
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
          <label className={LABEL_CLASS}>Confirm Password</label>
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
            className="inline-flex items-center gap-2 bg-[#007CF8] hover:bg-[#0066D6] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlanBillingSection() {
  const [tier, setTier] = useState('free');
  const [source, setSource] = useState('none');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isTrialOrGrant, setIsTrialOrGrant] = useState(false);
  const [loading, setLoading] = useState(true);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const fetchTier = async () => {
    try {
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier || 'free');
        setSource(data.source || 'none');
        setExpiresAt(data.expiresAt);
        setIsTrialOrGrant(data.isTrialOrGrant || false);
      }
    } catch {
      // Default to free
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTier();
  }, []);

  const handleRedeem = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const res = await fetch('/api/subscription/redeem-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });

      const data = await res.json();

      if (data.success) {
        setPromoSuccess(`Welcome to ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}! Your access is active for ${data.durationDays} days.`);
        setPromoCode('');
        // Refresh tier display
        fetchTier();
      } else {
        setPromoError(data.error || 'Invalid promo code.');
      }
    } catch {
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColor = tier === 'free'
    ? 'bg-gray-100 text-gray-700'
    : 'bg-[#007CF8] text-white';

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-gray-400" />
        Plan & Billing
      </h2>

      <div className="mb-5">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${tierColor}`}>
          {tierLabel}
        </span>
        <p className="text-sm text-gray-500 mt-2">
          {tier === 'free'
            ? "You're on the Free plan."
            : isTrialOrGrant && formattedExpiry
              ? `You're on the ${tierLabel} plan (trial) — expires ${formattedExpiry}.`
              : `You're on the ${tierLabel} plan.`}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-gray-400" />
          Redeem a Promo Code
        </h3>
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className={INPUT_CLASS + ' flex-1'}
            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
          />
          <button
            onClick={handleRedeem}
            disabled={promoLoading || !promoCode.trim()}
            className="px-5 py-2.5 bg-[#007CF8] text-white rounded-lg text-sm font-medium hover:bg-[#0066D6] transition disabled:opacity-50 flex-shrink-0"
          >
            {promoLoading ? 'Redeeming...' : 'Redeem'}
          </button>
        </div>
        {promoError && <p className="text-xs text-red-600 mt-2">{promoError}</p>}
        {promoSuccess && (
          <div className="flex items-center gap-2 mt-2">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <p className="text-xs text-emerald-600">{promoSuccess}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 mt-5 pt-4">
        <a href="/#pricing" className="text-sm text-[#007CF8] font-medium hover:underline">
          View Plans &rarr;
        </a>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [memberSince, setMemberSince] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Team context
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [memberRole, setMemberRole] = useState('owner');
  const [hasCompany, setHasCompany] = useState(false);

  // Section A — Personal Info
  const [personalSaving, setPersonalSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Section B — Startup fields
  const [companySaving, setCompanySaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyStage, setCompanyStage] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [teamSize, setTeamSize] = useState('');

  // Section B — Investor fields
  const [fundSaving, setFundSaving] = useState(false);
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
      try {
        const res = await fetch('/api/profile');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to load profile');

        const data = await res.json();
        const profile = data.profile;
        const teamCtx = data.teamContext;

        setEmail(profile.email || '');
        setRole(profile.role || '');
        setMemberSince(profile.created_at || '');

        // Personal info
        setFullName(profile.full_name || '');
        setJobTitle(profile.job_title || '');
        setLinkedinUrl(profile.linkedin_url || '');

        // Startup fields
        setCompanyName(profile.company_name || '');
        setOneLiner(profile.one_liner || '');
        setIndustry(profile.industry || '');
        setCompanyStage(profile.company_stage || '');
        setCompanyWebsite(profile.company_website || '');
        setCompanyCountry(profile.company_country || '');
        setTeamSize(profile.team_size ? String(profile.team_size) : '');

        // Investor fields
        setFundName(profile.fund_name || '');
        setAum(profile.aum ? String(profile.aum) : '');
        setTicketSizeMin(profile.ticket_size_min ? String(profile.ticket_size_min) : '');
        setTicketSizeMax(profile.ticket_size_max ? String(profile.ticket_size_max) : '');
        setStageFocus(profile.stage_focus || '');
        setSectorInterests(profile.sector_interests || '');
        setGeoFocus(profile.geo_focus || '');
        setInvestmentThesis(profile.investment_thesis || '');

        // Team context
        setIsTeamMember(teamCtx.isTeamMember);
        setMemberRole(teamCtx.memberRole);

        // Determine if user has a company (startup with company_name or team context has one)
        const isStartup = profile.role === 'startup' || profile.role === 'founder';
        setHasCompany(isStartup && !!(profile.company_name || teamCtx.companyName));
      } catch {
        setToast({ message: 'Failed to load profile', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const saveSection = async (
    fields: Record<string, unknown>,
    setSaving: (v: boolean) => void,
  ) => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setToast({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save. Please try again.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonal = () => {
    saveSection(
      { full_name: fullName, job_title: jobTitle, linkedin_url: linkedinUrl },
      setPersonalSaving,
    );
  };

  const handleSaveCompany = () => {
    saveSection(
      {
        company_name: companyName,
        one_liner: oneLiner,
        industry,
        company_stage: companyStage,
        company_website: companyWebsite,
        company_country: companyCountry,
        team_size: teamSize,
      },
      setCompanySaving,
    );
  };

  const handleSaveFund = () => {
    saveSection(
      {
        fund_name: fundName,
        aum,
        ticket_size_min: ticketSizeMin,
        ticket_size_max: ticketSizeMax,
        stage_focus: stageFocus,
        sector_interests: sectorInterests,
        geo_focus: geoFocus,
        investment_thesis: investmentThesis,
      },
      setFundSaving,
    );
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
      setToast({ message, type: 'error' });
      setIsDeleting(false);
    }
  };

  const isStartup = role === 'startup' || role === 'founder';
  const isInvestor = role === 'investor';
  const canEditCompany = memberRole === 'owner' || memberRole === 'admin';
  const showCompanySection = isStartup && (hasCompany || !isTeamMember);
  const showFundSection = isInvestor;

  const formattedMemberSince = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#007CF8] mb-4" />
          <p className="text-gray-500 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and profile information.</p>
      </div>

      {/* Section A — Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          Personal Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Email</label>
            <input type="email" value={email} disabled className={DISABLED_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Job Title</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="CEO & Co-Founder" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>LinkedIn URL</label>
            <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Role</label>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                isStartup ? 'bg-purple-100 text-purple-700' : isInvestor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {isStartup ? 'Startup' : isInvestor ? 'Investor' : role || '—'}
              </span>
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Member Since</label>
            <p className="text-sm text-gray-600 mt-1">{formattedMemberSince || '—'}</p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={handleSavePersonal}
            disabled={personalSaving}
            className="inline-flex items-center gap-2 bg-[#007CF8] hover:bg-[#0066D6] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
          >
            <Save className="w-4 h-4" />
            {personalSaving ? 'Saving...' : 'Save Personal Info'}
          </button>
        </div>
      </div>

      {/* Section B — Startup: Company Information */}
      {showCompanySection && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            Company Information
          </h2>
          {isTeamMember && !canEditCompany && (
            <p className="text-xs text-amber-600 mb-4">You have view-only access. Contact your team owner to make changes.</p>
          )}
          {canEditCompany && (
            <p className="text-xs text-gray-500 mb-5">Changes here will sync to your public company profile.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!canEditCompany} className={canEditCompany ? INPUT_CLASS : DISABLED_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Website</label>
              <input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} disabled={!canEditCompany} placeholder="https://yourcompany.com" className={canEditCompany ? INPUT_CLASS : DISABLED_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>One-Liner</label>
              <textarea
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value.slice(0, 160))}
                maxLength={160}
                rows={2}
                disabled={!canEditCompany}
                placeholder="What does your company do in one sentence?"
                className={canEditCompany ? INPUT_CLASS : DISABLED_CLASS}
              />
              <p className="text-xs text-gray-400 mt-1">{oneLiner.length}/160</p>
            </div>
            <div>
              <label className={LABEL_CLASS}>Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={!canEditCompany} className={canEditCompany ? SELECT_CLASS : DISABLED_CLASS}>
                <option value="">Select...</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Stage</label>
              <select value={companyStage} onChange={(e) => setCompanyStage(e.target.value)} disabled={!canEditCompany} className={canEditCompany ? SELECT_CLASS : DISABLED_CLASS}>
                <option value="">Select...</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Country / HQ</label>
              <input type="text" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} disabled={!canEditCompany} placeholder="United States" className={canEditCompany ? INPUT_CLASS : DISABLED_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Team Size</label>
              <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} disabled={!canEditCompany} placeholder="e.g. 5" min={1} className={canEditCompany ? INPUT_CLASS : DISABLED_CLASS} />
            </div>
          </div>
          {canEditCompany && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={handleSaveCompany}
                disabled={companySaving}
                className="inline-flex items-center gap-2 bg-[#007CF8] hover:bg-[#0066D6] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                <Save className="w-4 h-4" />
                {companySaving ? 'Saving...' : 'Save Company Info'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section B — Investor: Fund Information */}
      {showFundSection && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gray-400" />
            Investment Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Fund Name</label>
              <input type="text" value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Your fund or firm" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>AUM ($)</label>
              <input type="number" value={aum} onChange={(e) => setAum(e.target.value)} placeholder="Assets under management" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Min Check Size ($)</label>
              <input type="number" value={ticketSizeMin} onChange={(e) => setTicketSizeMin(e.target.value)} placeholder="e.g. 50000" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Max Check Size ($)</label>
              <input type="number" value={ticketSizeMax} onChange={(e) => setTicketSizeMax(e.target.value)} placeholder="e.g. 500000" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Stage Focus</label>
              <input type="text" value={stageFocus} onChange={(e) => setStageFocus(e.target.value)} placeholder="e.g. Seed, Series A" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Sector Interests</label>
              <input type="text" value={sectorInterests} onChange={(e) => setSectorInterests(e.target.value)} placeholder="e.g. FinTech, HealthTech" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Geographic Focus</label>
              <input type="text" value={geoFocus} onChange={(e) => setGeoFocus(e.target.value)} placeholder="e.g. MENA, US, Global" className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Investment Thesis</label>
              <textarea value={investmentThesis} onChange={(e) => setInvestmentThesis(e.target.value)} rows={3} placeholder="Describe your investment strategy and thesis..." className={INPUT_CLASS} />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveFund}
              disabled={fundSaving}
              className="inline-flex items-center gap-2 bg-[#007CF8] hover:bg-[#0066D6] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
            >
              <Save className="w-4 h-4" />
              {fundSaving ? 'Saving...' : 'Save Investment Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Change Password */}
      <ChangePasswordSection />

      {/* Plan & Billing */}
      <PlanBillingSection />

      {/* Sign Out */}
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-300 p-6 mb-10">
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
