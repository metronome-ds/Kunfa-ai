'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Save, LogOut, Check } from 'lucide-react';

const INDUSTRIES = [
  'AI & Machine Learning', 'B2B SaaS', 'B2C', 'Biotech & Life Sciences',
  'CleanTech & Energy', 'Consumer Hardware', 'Cybersecurity', 'DevTools & Infrastructure',
  'E-commerce & Marketplace', 'EdTech', 'FinTech', 'Food & Beverage', 'Gaming',
  'HealthTech', 'Logistics & Supply Chain', 'Media & Entertainment',
  'PropTech & Real Estate', 'Social', 'Travel & Hospitality', 'Web3 & Crypto', 'Other',
];

const STAGES = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c+', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
];

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all';
const SELECT_CLASS = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all';
const DISABLED_CLASS = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed';

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

  const isStartup = role === 'startup' || role === 'founder';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4" />
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
        <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <Check className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Settings saved successfully.</p>
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
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition"
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
    </div>
  );
}
